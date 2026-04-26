const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { SKILL_TAXONOMY } = require('./constants/taxonomy');
const { store, createId, nowIso } = require('./data/store');
const { seed } = require('./data/seed');
const { authRequired } = require('./middleware/auth');
const { issueAccessToken, issueRefreshToken, verifyRefreshToken } = require('./utils/tokens');
const { verifySkillDescription, semanticRecommendProviders, categorizeRequest } = require('./services/aiIntegration');
const { inspectMessage, buildTrustScore } = require('./services/cyberIntegration');
const MIN_SESSION_DURATION_MS = 10 * 60 * 1000;

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// FIX: Default ALLOW_NO_ORIGIN to true.
// When using the Vite dev proxy, the browser sees requests as same-origin and
// does NOT send an Origin header. The proxy forwards them without Origin, so
// the backend must allow origin-less requests in development.
// Set ALLOW_NO_ORIGIN=false explicitly to restrict this in production.
const ALLOW_NO_ORIGIN = process.env.ALLOW_NO_ORIGIN !== 'false';

function isAllowedOrigin(origin) {
  if (!origin) return ALLOW_NO_ORIGIN;
  return allowedOrigins.includes(origin);
}

function corsOriginValidator(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
}

const COOKIE_ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.COOKIE_ENCRYPTION_SECRET || 'skillrent-cookie-encryption-secret')
  .digest();

app.use(helmet());
app.use(cors({ origin: corsOriginValidator, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

function setCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie('skillrent_csrf', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrfToken;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function encryptToken(plainToken) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', COOKIE_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainToken, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptToken(serializedToken) {
  const [ivBase64, tagBase64, encryptedBase64] = String(serializedToken || '').split('.');
  if (!ivBase64 || !tagBase64 || !encryptedBase64) throw new Error('Invalid token payload');

  const iv = Buffer.from(ivBase64, 'base64url');
  const authTag = Buffer.from(tagBase64, 'base64url');
  const encrypted = Buffer.from(encryptedBase64, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', COOKIE_ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function findStoredTokenHash(incomingHash) {
  for (const storedHash of store.refreshTokens.keys()) {
    const stored = Buffer.from(storedHash, 'hex');
    const incoming = Buffer.from(incomingHash, 'hex');
    if (stored.length === incoming.length && crypto.timingSafeEqual(stored, incoming)) return storedHash;
  }
  return null;
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies.skillrent_csrf;
  const headerToken = req.headers['x-csrf-token'];
  console.log('[CSRF]', new Date().toISOString(), req.method, req.path, {
    cookie: !!cookieToken,
    header: !!headerToken,
    cookieSnippet: cookieToken ? cookieToken.slice(0,8) + '...' : 'none',
    headerSnippet: headerToken ? headerToken.slice(0,8) + '...' : 'none',
    match: cookieToken === headerToken
  });
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  return next();
}

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', csrfProtection);

const io = new Server(server, {
  cors: { origin: corsOriginValidator, credentials: true },
});

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function setRefreshCookie(res, refreshToken) {
  const encryptedToken = encryptToken(refreshToken);
  res.cookie('skillrent_refresh', encryptedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function pushAnomaly(userId, ruleTriggered, severity, details) {
  store.anomalyFlags.push({
    id: createId('flag'),
    userId,
    ruleTriggered,
    severity,
    details,
    resolved: false,
    createdAt: nowIso(),
  });
}

function pushNotification(userId, type, title, body, meta = {}) {
  const notif = {
    id: createId('notif'),
    userId,
    type,
    title,
    body,
    meta,
    read: false,
    createdAt: nowIso(),
  };
  store.notifications.push(notif);
  io.to(userId).emit('notification:new', notif);
  return notif;
}

function recalcTrust(userId) {
  const user = store.users.find((u) => u.id === userId);
  if (!user) return;

  const completedSessions = store.sessions.filter((s) => s.status === 'completed' && (s.providerId === userId || s.seekerId === userId)).length;
  const reviews = store.reviews.filter((r) => r.revieweeId === userId);
  const avgRating = reviews.length ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
  const verifiedSkills = store.skills.some((s) => s.userId === userId && s.isVerified);
  const flagsCount = store.anomalyFlags.filter((f) => f.userId === userId && !f.resolved).length;

  user.trustScore = buildTrustScore(user, { completedSessions, avgRating, verifiedSkills, flagsCount });
}

const registrationSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  city: z.string().min(2),
  bio: z.string().min(10),
});

// ==================== Public ====================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SkillRent Web MVP API', timestamp: nowIso() });
});

app.get('/api/taxonomy', (_req, res) => {
  res.json({ taxonomy: SKILL_TAXONOMY });
});

app.get('/api/stats/public', (_req, res) => {
  const providersCount = new Set(store.skills.map((s) => s.userId)).size;
  const completedCount = store.sessions.filter((s) => s.status === 'completed').length;
  const avgRating = store.reviews.length
    ? store.reviews.reduce((a, r) => a + r.rating, 0) / store.reviews.length
    : 0;
  res.json({
    totalUsers: store.users.length,
    totalProviders: providersCount,
    totalSkills: store.skills.length,
    totalSessions: store.sessions.length,
    completedSessions: completedCount,
    averageRating: Number(avgRating.toFixed(2)),
    categories: SKILL_TAXONOMY.length,
  });
});

// ==================== Auth ====================
app.get('/api/auth/csrf', (_req, res) => {
  const csrfToken = setCsrfCookie(res);
  res.json({ csrfToken });
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password, city, bio } = parsed.data;
  if (store.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already used' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: createId('user'),
    name,
    email,
    passwordHash,
    city,
    bio,
    avatarUrl: null,
    role: 'both',
    onboardingDone: false,
    isEmailVerified: false,
    trustScore: { value: 45, band: 'orange' },
    availabilityStatus: 'offline',
    createdAt: nowIso(),
  };

  store.users.push(user);
  store.registrationEvents.push({ ip: req.ip, userId: user.id, createdAt: Date.now() });

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const sameIpRecent = store.registrationEvents.filter((x) => x.ip === req.ip && x.createdAt >= dayAgo);
  if (sameIpRecent.length > 2) {
    const impactedUserIds = new Set();
    sameIpRecent.forEach((event) => {
      pushAnomaly(event.userId, 'Rule 4 - Unusual IP behavior', 'high', `IP ${req.ip} registered ${sameIpRecent.length} accounts in 24h`);
      impactedUserIds.add(event.userId);
    });
    impactedUserIds.forEach((userId) => recalcTrust(userId));
  }

  console.log(`[mock-email] Verification email sent to ${email}`);

  const accessToken = issueAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);
  store.refreshTokens.set(hashToken(refreshToken), user.id);
  setRefreshCookie(res, refreshToken);
  const csrfToken = setCsrfCookie(res);

  return res.status(201).json({ accessToken, user: sanitizeUser(user), csrfToken });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = store.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isValid = await bcrypt.compare(String(password || ''), user.passwordHash);
  console.log('[LOGIN]', new Date().toISOString(), email, 'bcrypt isValid:', isValid);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = issueAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);
  store.refreshTokens.set(hashToken(refreshToken), user.id);
  setRefreshCookie(res, refreshToken);
  const csrfToken = setCsrfCookie(res);

  return res.json({ accessToken, user: sanitizeUser(user), csrfToken });
});

app.post('/api/auth/refresh', (req, res) => {
  const encryptedToken = req.cookies.skillrent_refresh;
  let token;
  try {
    token = decryptToken(encryptedToken);
  } catch {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  const tokenHash = token ? hashToken(token) : '';
  const storedTokenHash = findStoredTokenHash(tokenHash);
  if (!token || !storedTokenHash) return res.status(401).json({ error: 'Refresh token missing' });

  try {
    const payload = verifyRefreshToken(token);
    const user = store.users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = issueAccessToken(user.id);
    const csrfToken = setCsrfCookie(res);
    return res.json({ accessToken, user: sanitizeUser(user), csrfToken });
  } catch {
    if (storedTokenHash) store.refreshTokens.delete(storedTokenHash);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const encryptedToken = req.cookies.skillrent_refresh;
  if (encryptedToken) {
    try {
      const token = decryptToken(encryptedToken);
      const tokenHash = hashToken(token);
      const storedTokenHash = findStoredTokenHash(tokenHash);
      if (storedTokenHash) store.refreshTokens.delete(storedTokenHash);
    } catch {
      // ignore
    }
  }
  res.clearCookie('skillrent_refresh');
  res.clearCookie('skillrent_csrf');
  res.json({ ok: true });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// ==================== User profile ====================
app.patch('/api/users/me', authRequired, (req, res) => {
  const { name, bio, city, avatarUrl } = req.body;
  if (name) req.user.name = String(name).trim();
  if (bio) req.user.bio = String(bio).trim();
  if (city) req.user.city = String(city).trim();
  if (typeof avatarUrl === 'string') req.user.avatarUrl = avatarUrl.trim() || null;
  req.user.updatedAt = nowIso();
  res.json({ user: sanitizeUser(req.user) });
});

app.post('/api/users/me/password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Invalid passwords' });
  }
  const ok = await bcrypt.compare(String(currentPassword), req.user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
  req.user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  res.json({ ok: true });
});

app.post('/api/users/me/availability', authRequired, (req, res) => {
  const { availabilityStatus } = req.body;
  const activeProviderSession = store.sessions.find((s) => s.providerId === req.user.id && s.status === 'active');
  if (activeProviderSession) return res.status(400).json({ error: 'Provider cannot change availability during active session' });
  req.user.availabilityStatus = availabilityStatus;
  res.json({ user: sanitizeUser(req.user) });
});

// ==================== Onboarding ====================
app.post('/api/onboarding', authRequired, async (req, res) => {
  const { mode, skills = [], avatarUrl } = req.body;

  req.user.role = mode || 'both';
  req.user.avatarUrl = avatarUrl || req.user.avatarUrl;
  req.user.onboardingDone = true;

  if (req.user.role === 'provider' || req.user.role === 'both') {
    for (const skillInput of skills) {
      const ai = await verifySkillDescription(
        skillInput.description,
        skillInput.category,
        skillInput.subcategory
      );

      store.skills.push({
        id: createId('skill'),
        userId: req.user.id,
        category: skillInput.category,
        subcategory: skillInput.subcategory,
        description: skillInput.description,
        hourlyRate: Number(skillInput.hourlyRate || 0),
        responseTime: skillInput.responseTime || 'within 15 min',
        availabilityStatus: skillInput.availabilityStatus || 'available_now',
        aiConfidenceScore: ai.confidence,
        aiSuggestedCategory: ai.suggestedCategory,
        isVerified: ai.providerBadgeEligible,
        avgRating: 0,
        completedSessions: 0,
        createdAt: nowIso(),
      });
    }
  }

  recalcTrust(req.user.id);
  res.json({ user: sanitizeUser(req.user), skills: store.skills.filter((s) => s.userId === req.user.id) });
});

// ==================== Skills CRUD ====================
app.get('/api/skills/me', authRequired, (req, res) => {
  const skills = store.skills.filter((s) => s.userId === req.user.id);
  res.json({ skills });
});

app.post('/api/skills', authRequired, async(req, res) => {
  const { category, subcategory, description, hourlyRate, responseTime, availabilityStatus } = req.body;
  if (!category || !subcategory || !description) return res.status(400).json({ error: 'Missing fields' });
const ai = await verifySkillDescription(description, category, subcategory);
  const skill = {
    id: createId('skill'),
    userId: req.user.id,
    category,
    subcategory,
    description,
    hourlyRate: Number(hourlyRate || 0),
    responseTime: responseTime || 'within 15 min',
    availabilityStatus: availabilityStatus || 'available_now',
    aiConfidenceScore: ai.confidence,
    aiSuggestedCategory: ai.suggestedCategory,
    isVerified: ai.providerBadgeEligible,
    avgRating: 0,
    completedSessions: 0,
    createdAt: nowIso(),
  };
  store.skills.push(skill);
  recalcTrust(req.user.id);
  res.status(201).json({ skill });
});

app.patch('/api/skills/:skillId', authRequired, (req, res) => {
  const skill = store.skills.find((s) => s.id === req.params.skillId);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  if (skill.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
  ['description', 'hourlyRate', 'responseTime', 'availabilityStatus', 'subcategory', 'category'].forEach((f) => {
    if (req.body[f] !== undefined) skill[f] = f === 'hourlyRate' ? Number(req.body[f]) : req.body[f];
  });
  skill.updatedAt = nowIso();
  res.json({ skill });
});

app.delete('/api/skills/:skillId', authRequired, (req, res) => {
  const idx = store.skills.findIndex((s) => s.id === req.params.skillId);
  if (idx < 0) return res.status(404).json({ error: 'Skill not found' });
  if (store.skills[idx].userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
  store.skills.splice(idx, 1);
  res.json({ ok: true });
});

// ==================== Providers ====================
app.get('/api/providers', (_req, res) => {
  const { category, subcategory, availability } = _req.query;
  const entries = store.skills.filter((skill) => {
    if (category && skill.category !== category) return false;
    if (subcategory && skill.subcategory !== subcategory) return false;
    if (availability && skill.availabilityStatus !== availability) return false;
    return true;
  }).map((skill) => {
    const user = store.users.find((u) => u.id === skill.userId);
    return { ...skill, provider: user ? sanitizeUser(user) : null };
  });
  res.json({ providers: entries });
});

app.get('/api/providers/search', (req, res) => {
  const { q = '', category, subcategory, availability, maxRate, minRate, sort = 'relevance' } = req.query;
  const query = String(q).toLowerCase().trim();

  let results = store.skills.map((skill) => {
    const user = store.users.find((u) => u.id === skill.userId);
    return { ...skill, provider: user ? sanitizeUser(user) : null };
  });

  if (category) results = results.filter((s) => s.category === category);
  if (subcategory) results = results.filter((s) => s.subcategory === subcategory);
  if (availability) results = results.filter((s) => s.availabilityStatus === availability);
  if (minRate) results = results.filter((s) => s.hourlyRate >= Number(minRate));
  if (maxRate) results = results.filter((s) => s.hourlyRate <= Number(maxRate));

  if (query) {
    results = results.filter((s) => {
      const hay = `${s.description} ${s.category} ${s.subcategory} ${s.provider?.name || ''} ${s.provider?.city || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }

  if (sort === 'rate_asc') results.sort((a, b) => a.hourlyRate - b.hourlyRate);
  else if (sort === 'rate_desc') results.sort((a, b) => b.hourlyRate - a.hourlyRate);
  else if (sort === 'rating') results.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

  res.json({ providers: results });
});

app.get('/api/providers/:providerId', (req, res) => {
  const provider = store.users.find((u) => u.id === req.params.providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const skills = store.skills.filter((s) => s.userId === provider.id);
  const sessionsCount = store.sessions.filter((s) => s.status === 'completed' && s.providerId === provider.id).length;
  const providerReviews = store.reviews.filter((r) => r.revieweeId === provider.id).map((r) => {
    const reviewer = store.users.find((u) => u.id === r.reviewerId);
    return { ...r, reviewer: reviewer ? { id: reviewer.id, name: reviewer.name, avatarUrl: reviewer.avatarUrl } : null };
  });
  const averageRating = providerReviews.length ? providerReviews.reduce((acc, r) => acc + r.rating, 0) / providerReviews.length : 0;

  res.json({
    provider: sanitizeUser(provider),
    profile: { skills, reviews: providerReviews, completedSessions: sessionsCount, averageRating },
    skills,
    reviews: providerReviews,
    completedSessions: sessionsCount,
    averageRating,
  });
});

// ==================== Requests ====================

app.post('/api/requests', authRequired, async (req, res) => {
  let { title, description, category, subcategory, urgency, budget } = req.body;
 
  // Auto-fill category/subcategory when the client didn't send them
  if (!category || !subcategory) {
    try {
      const ai = await categorizeRequest(title || '', description || '');
      category    = category    || ai.category;
      subcategory = subcategory || ai.subcategory;
    } catch {
      category    = category    || 'Tech & Development';
      subcategory = subcategory || 'Web Development';
    }
  }
 
  const item = {
    id: createId('req'),
    seekerId: req.user.id,
    title,
    description,
    category,
    subcategory,
    urgency,
    budget: budget ? Number(budget) : null,
    status: 'open',
    applicants: [],
    createdAt: nowIso(),
  };
 
  const recommended = await semanticRecommendProviders(
    description || `${title} ${category}`,
    store.skills
  );
  item.recommendedProviders = recommended;
 
  store.requests.push(item);
 
  recommended.forEach((rec) => {
    pushNotification(
      rec.providerId,
      'new_request',
      'A new request matches your skills',
      title,
      { requestId: item.id }
    );
  });
 
  res.status(201).json({ request: item });
});

app.get('/api/requests', authRequired, (_req, res) => {
  const requests = store.requests.map((r) => {
    const seeker = store.users.find((u) => u.id === r.seekerId);
    return {
      ...r,
      seeker: seeker ? { id: seeker.id, name: seeker.name, avatarUrl: seeker.avatarUrl, city: seeker.city } : null,
    };
  });
  res.json({ requests });
});

app.post('/api/requests/:requestId/apply', authRequired, (req, res) => {
  const requestItem = store.requests.find((r) => r.id === req.params.requestId);
  if (!requestItem) return res.status(404).json({ error: 'Request not found' });

  if (!requestItem.applicants.includes(req.user.id)) {
    requestItem.applicants.push(req.user.id);
    pushNotification(
      requestItem.seekerId,
      'application',
      'New applicant on your request',
      `${req.user.name} applied to "${requestItem.title}"`,
      { requestId: requestItem.id, applicantId: req.user.id }
    );
  }
  res.json({ request: requestItem });
});

app.post('/api/requests/:requestId/accept', authRequired, (req, res) => {
  const requestItem = store.requests.find((r) => r.id === req.params.requestId);
  if (!requestItem) return res.status(404).json({ error: 'Request not found' });

  const providerId = req.user.id;
  requestItem.status = 'matched';

  const scheduledStart = req.body.scheduledStart || new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const scheduledEnd = req.body.scheduledEnd || new Date(new Date(scheduledStart).getTime() + 60 * 60 * 1000).toISOString();
  const providerSkill = store.skills.find((s) => s.userId === providerId && s.category === requestItem.category && s.subcategory === requestItem.subcategory)
    || store.skills.find((s) => s.userId === providerId);
  const agreedAmount = Number(requestItem.budget || providerSkill?.hourlyRate || 25);

  const session = {
    id: createId('sess'),
    requestId: requestItem.id,
    providerId,
    seekerId: requestItem.seekerId,
    scheduledStart,
    scheduledEnd,
    actualStart: null,
    actualEnd: null,
    agreedAmount,
    status: 'pending',
    protectedMode: false,
    createdAt: nowIso(),
  };

  store.sessions.push(session);

  const hourAfterUserCreation = new Date(req.user.createdAt).getTime() + 60 * 60 * 1000;
  if (Date.now() < hourAfterUserCreation) {
    const acceptedInFirstHour = store.sessions.filter((s) => s.providerId === req.user.id && new Date(s.createdAt).getTime() < hourAfterUserCreation).length;
    if (acceptedInFirstHour > 5) {
      pushAnomaly(req.user.id, 'Rule 1 - Account farming', 'high', 'Accepted more than 5 sessions in first hour after registration');
      recalcTrust(req.user.id);
    }
  }

  io.to(requestItem.seekerId).emit('session:created', session);
  io.to(providerId).emit('session:created', session);

  pushNotification(requestItem.seekerId, 'session_created', 'A provider accepted your request', requestItem.title, { sessionId: session.id });

  res.status(201).json({ session });
});

// ==================== Sessions ====================
app.get('/api/sessions/me', authRequired, (req, res) => {
  const sessions = store.sessions
    .filter((s) => s.providerId === req.user.id || s.seekerId === req.user.id)
    .map((s) => {
      const provider = store.users.find((u) => u.id === s.providerId);
      const seeker = store.users.find((u) => u.id === s.seekerId);
      return {
        ...s,
        provider: provider ? { id: provider.id, name: provider.name, avatarUrl: provider.avatarUrl } : null,
        seeker: seeker ? { id: seeker.id, name: seeker.name, avatarUrl: seeker.avatarUrl } : null,
      };
    });
  res.json({ sessions });
});

app.post('/api/sessions/:sessionId/start', authRequired, (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (![session.providerId, session.seekerId].includes(req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

  session.status = 'active';
  session.actualStart = nowIso();
  session.protectedMode = true;

  io.to(session.id).emit('session:started', session);
  pushNotification(session.providerId, 'session_started', 'Session started', 'Your session is now live', { sessionId: session.id });
  pushNotification(session.seekerId, 'session_started', 'Session started', 'Your session is now live', { sessionId: session.id });
  res.json({ session });
});

app.post('/api/sessions/:sessionId/complete', authRequired, (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.seekerId !== req.user.id) return res.status(403).json({ error: 'Only seeker can complete' });

  const startedAt = new Date(session.actualStart || session.createdAt).getTime();
  if (Date.now() - startedAt < MIN_SESSION_DURATION_MS) {
    return res.status(400).json({ error: 'Session must run at least 10 minutes before completion' });
  }

  session.status = 'completed';
  session.actualEnd = nowIso();
  session.protectedMode = false;

  store.skills.forEach((skill) => {
    if (skill.userId === session.providerId) skill.completedSessions += 1;
  });

  recalcTrust(session.providerId);
  recalcTrust(session.seekerId);

  io.to(session.id).emit('session:completed', session);
  pushNotification(session.providerId, 'session_completed', 'Session completed', 'Please leave a mutual review', { sessionId: session.id });
  res.json({ session });
});

app.get('/api/sessions/:sessionId/messages', authRequired, (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (![session.providerId, session.seekerId].includes(req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

  const messages = store.messages.filter((m) => m.sessionId === session.id);
  res.json({ messages });
});

app.post('/api/sessions/:sessionId/messages', authRequired, (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (![session.providerId, session.seekerId].includes(req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

  const { content } = req.body;
  const analysis = inspectMessage(String(content || ''));
  const blocked = session.protectedMode && /paypal\.me|\bhttps?:\/\//i.test(content);

  if (blocked) {
    pushAnomaly(req.user.id, 'Rule 3 - Message pattern detection', 'high', 'Blocked external payment link during protected session mode');
    recalcTrust(req.user.id);
    return res.status(400).json({ error: 'External payment/contact links are blocked in protected session mode.' });
  }

  const message = {
    id: createId('msg'),
    sessionId: session.id,
    senderId: req.user.id,
    content,
    isFlagged: analysis.flagged,
    flagReason: analysis.reason,
    createdAt: nowIso(),
  };

  if (analysis.flagged) {
    pushAnomaly(req.user.id, 'Rule 3 - Message pattern detection', analysis.severity, analysis.reason);
    recalcTrust(req.user.id);
  }

  store.messages.push(message);
  io.to(session.id).emit('message:new', message);

  const otherUserId = session.providerId === req.user.id ? session.seekerId : session.providerId;
  pushNotification(otherUserId, 'new_message', 'New message', String(content).slice(0, 80), { sessionId: session.id });

  res.status(201).json({ message });
});

// ==================== Reviews ====================
app.post('/api/reviews', authRequired, (req, res) => {
  const { sessionId, revieweeId, rating, comment } = req.body;
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session || session.status !== 'completed') return res.status(400).json({ error: 'Session is not completed' });

  const isParticipant = [session.providerId, session.seekerId].includes(req.user.id);
  if (!isParticipant) return res.status(403).json({ error: 'Unauthorized' });

  const review = {
    id: createId('rev'),
    sessionId,
    reviewerId: req.user.id,
    revieweeId,
    rating: Number(rating),
    comment: String(comment || ''),
    isSuspicious: false,
    createdAt: nowIso(),
  };

  const lastTenMin = Date.now() - 10 * 60 * 1000;
  const recentReviewsByUser = store.reviews.filter((r) => r.reviewerId === req.user.id && new Date(r.createdAt).getTime() >= lastTenMin);
  if (recentReviewsByUser.length >= 3) {
    review.isSuspicious = true;
    pushAnomaly(req.user.id, 'Rule 2 - Review bombing', 'medium', 'Submitted more than 3 reviews within 10 minutes');
  }

  store.reviews.push(review);
  recalcTrust(review.revieweeId);
  recalcTrust(req.user.id);

  pushNotification(revieweeId, 'new_review', 'You received a new review', `Rating: ${rating}/5`, { sessionId });

  res.status(201).json({ review });
});

// ==================== Favorites ====================
app.get('/api/favorites', authRequired, (req, res) => {
  const favorites = store.favorites.filter((f) => f.userId === req.user.id).map((f) => {
    const provider = store.users.find((u) => u.id === f.providerId);
    const skills = store.skills.filter((s) => s.userId === f.providerId);
    return { ...f, provider: provider ? sanitizeUser(provider) : null, skills };
  });
  res.json({ favorites });
});

app.post('/api/favorites/:providerId', authRequired, (req, res) => {
  const existing = store.favorites.find((f) => f.userId === req.user.id && f.providerId === req.params.providerId);
  if (existing) return res.json({ favorite: existing });
  const fav = { id: createId('fav'), userId: req.user.id, providerId: req.params.providerId, createdAt: nowIso() };
  store.favorites.push(fav);
  res.status(201).json({ favorite: fav });
});

app.delete('/api/favorites/:providerId', authRequired, (req, res) => {
  const idx = store.favorites.findIndex((f) => f.userId === req.user.id && f.providerId === req.params.providerId);
  if (idx < 0) return res.status(404).json({ error: 'Favorite not found' });
  store.favorites.splice(idx, 1);
  res.json({ ok: true });
});

// ==================== Notifications ====================
app.get('/api/notifications', authRequired, (req, res) => {
  const notifications = store.notifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  res.json({ notifications });
});

app.post('/api/notifications/:id/read', authRequired, (req, res) => {
  const n = store.notifications.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!n) return res.status(404).json({ error: 'Not found' });
  n.read = true;
  res.json({ notification: n });
});

app.post('/api/notifications/read-all', authRequired, (req, res) => {
  store.notifications.forEach((n) => {
    if (n.userId === req.user.id) n.read = true;
  });
  res.json({ ok: true });
});

// ==================== Dashboards ====================
app.get('/api/dashboard/provider', authRequired, (req, res) => {
  const sessions = store.sessions.filter((s) => s.providerId === req.user.id);
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const active = sessions.filter((s) => s.status === 'active').length;
  const pending = sessions.filter((s) => s.status === 'pending').length;
  const earnings = sessions
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + Number(s.agreedAmount || 0), 0);
  const ratingRows = store.reviews.filter((r) => r.revieweeId === req.user.id);
  const avgRating = ratingRows.length ? ratingRows.reduce((acc, r) => acc + r.rating, 0) / ratingRows.length : 0;

  res.json({
    totalEarnings: earnings,
    sessionsCompleted: completed,
    activeSessions: active,
    averageRating: avgRating,
    pendingRequests: pending,
    currentAvailability: req.user.availabilityStatus,
    trustScore: req.user.trustScore,
    reviewsCount: ratingRows.length,
  });
});

app.get('/api/dashboard/seeker', authRequired, (req, res) => {
  const sessions = store.sessions.filter((s) => s.seekerId === req.user.id);
  const active = sessions.filter((s) => s.status === 'active');
  const past = sessions.filter((s) => s.status === 'completed');
  const spendingSummary = past.reduce((acc, s) => acc + Number(s.agreedAmount || 0), 0);
  const favoriteProviders = store.favorites.filter((f) => f.userId === req.user.id).length;

  res.json({
    activeSessions: active,
    pastSessions: past,
    spendingSummary,
    favoriteProviders,
    totalRequests: store.requests.filter((r) => r.seekerId === req.user.id).length,
  });
});

app.get('/api/admin/anomaly-flags', authRequired, (req, res) => {
  res.json({ flags: store.anomalyFlags });
});

// ==================== Socket.io ====================
io.on('connection', (socket) => {
  socket.on('auth:identify', ({ userId }) => {
    if (!userId) return;
    socket.join(userId);
    socket.data.userId = userId;
  });

  socket.on('session:join', ({ sessionId }) => {
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    if (![session.providerId, session.seekerId].includes(socket.data.userId)) return;
    socket.join(sessionId);
  });

  socket.on('message:send', ({ sessionId, content }) => {
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const senderId = socket.data.userId;
    if (!senderId || ![session.providerId, session.seekerId].includes(senderId)) return;

    const blocked = session.protectedMode && /paypal\.me|\bhttps?:\/\//i.test(content);
    if (blocked) {
      socket.emit('message:error', { error: 'Blocked by protected session mode policy' });
      return;
    }

    const analysis = inspectMessage(String(content || ''));
    const message = {
      id: createId('msg'),
      sessionId,
      senderId,
      content,
      isFlagged: analysis.flagged,
      flagReason: analysis.reason,
      createdAt: nowIso(),
    };

    store.messages.push(message);
    io.to(sessionId).emit('message:new', message);
  });
});

// ==================== Error handler (MUST be last) ====================
// FIX: The error handler was previously placed before all routes, meaning
// errors thrown by routes would NOT be caught by it (Express walks forward
// through the middleware stack when handling errors). It must come after routes.
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', new Date().toISOString(), req.method, req.url, err.stack || err.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== Bootstrap ====================
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
  try {
    await seed();
  } catch (e) {
    console.error('[seed] failed:', e.message);
  }
  server.listen(PORT, HOST, () => {
    console.log(`SkillRent backend running on ${HOST}:${PORT}`);
  });
})();