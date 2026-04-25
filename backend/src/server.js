const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const { z } = require('zod');
const { SKILL_TAXONOMY } = require('./constants/taxonomy');
const { store, createId, nowIso } = require('./data/store');
const { authRequired } = require('./middleware/auth');
const { issueAccessToken, issueRefreshToken, verifyRefreshToken } = require('./utils/tokens');
const { verifySkillDescription, semanticRecommendProviders } = require('./services/aiIntegration');
const { inspectMessage, buildTrustScore } = require('./services/cyberIntegration');

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const io = new Server(server, {
  cors: { origin: allowedOrigin, credentials: true }
});

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('skillrent_refresh', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
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
    createdAt: nowIso()
  });
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
  bio: z.string().min(10)
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SkillRent Web MVP API', timestamp: nowIso() });
});

app.get('/api/taxonomy', (_req, res) => {
  res.json({ taxonomy: SKILL_TAXONOMY });
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
    createdAt: nowIso()
  };

  store.users.push(user);
  store.registrationEvents.push({ ip: req.ip, userId: user.id, createdAt: Date.now() });

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const sameIpRecent = store.registrationEvents.filter((x) => x.ip === req.ip && x.createdAt >= dayAgo);
  if (sameIpRecent.length > 2) {
    sameIpRecent.forEach((event) => {
      pushAnomaly(event.userId, 'Rule 4 - Unusual IP behavior', 'high', `IP ${req.ip} registered ${sameIpRecent.length} accounts in 24h`);
      recalcTrust(event.userId);
    });
  }

  console.log(`[mock-email] Verification email sent to ${email}`);

  const accessToken = issueAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);
  store.refreshTokens.set(refreshToken, user.id);
  setRefreshCookie(res, refreshToken);

  return res.status(201).json({ accessToken, user: sanitizeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = store.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isValid = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = issueAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);
  store.refreshTokens.set(refreshToken, user.id);
  setRefreshCookie(res, refreshToken);

  return res.json({ accessToken, user: sanitizeUser(user) });
});

app.post('/api/auth/refresh', (req, res) => {
  const token = req.cookies.skillrent_refresh;
  if (!token || !store.refreshTokens.has(token)) return res.status(401).json({ error: 'Refresh token missing' });

  try {
    const payload = verifyRefreshToken(token);
    const user = store.users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = issueAccessToken(user.id);
    return res.json({ accessToken, user: sanitizeUser(user) });
  } catch {
    store.refreshTokens.delete(token);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.skillrent_refresh;
  if (token) store.refreshTokens.delete(token);
  res.clearCookie('skillrent_refresh');
  res.json({ ok: true });
});

app.post('/api/onboarding', authRequired, (req, res) => {
  const { mode, skills = [], avatarUrl } = req.body;

  req.user.role = mode || 'both';
  req.user.avatarUrl = avatarUrl || req.user.avatarUrl;
  req.user.onboardingDone = true;

  if (req.user.role === 'provider' || req.user.role === 'both') {
    skills.forEach((skillInput) => {
      const ai = verifySkillDescription(skillInput.description);
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
        createdAt: nowIso()
      });
    });
  }

  recalcTrust(req.user.id);
  res.json({ user: sanitizeUser(req.user), skills: store.skills.filter((s) => s.userId === req.user.id) });
});

app.get('/api/providers', (_req, res) => {
  const { category, subcategory, availability } = _req.query;

  const entries = store.skills.filter((skill) => {
    if (category && skill.category !== category) return false;
    if (subcategory && skill.subcategory !== subcategory) return false;
    if (availability && skill.availabilityStatus !== availability) return false;
    return true;
  }).map((skill) => {
    const user = store.users.find((u) => u.id === skill.userId);
    return {
      ...skill,
      provider: user ? sanitizeUser(user) : null
    };
  });

  res.json({ providers: entries });
});

app.get('/api/providers/:providerId', (req, res) => {
  const provider = store.users.find((u) => u.id === req.params.providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const skills = store.skills.filter((s) => s.userId === provider.id);
  const sessionsCount = store.sessions.filter((s) => s.status === 'completed' && s.providerId === provider.id).length;
  const providerReviews = store.reviews.filter((r) => r.revieweeId === provider.id);
  const averageRating = providerReviews.length ? providerReviews.reduce((acc, r) => acc + r.rating, 0) / providerReviews.length : 0;

  res.json({
    provider: sanitizeUser(provider),
    profile: {
      skills,
      completedSessions: sessionsCount,
      averageRating
    }
  });
});

app.post('/api/requests', authRequired, (req, res) => {
  const { title, description, category, subcategory, urgency, budget } = req.body;

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
    createdAt: nowIso()
  };

  const recommended = semanticRecommendProviders(description || `${title} ${category}`, store.skills);
  item.recommendedProviders = recommended;

  store.requests.push(item);
  res.status(201).json({ request: item });
});

app.get('/api/requests', authRequired, (_req, res) => {
  res.json({ requests: store.requests });
});

app.post('/api/requests/:requestId/apply', authRequired, (req, res) => {
  const requestItem = store.requests.find((r) => r.id === req.params.requestId);
  if (!requestItem) return res.status(404).json({ error: 'Request not found' });

  if (!requestItem.applicants.includes(req.user.id)) requestItem.applicants.push(req.user.id);
  res.json({ request: requestItem });
});

app.post('/api/requests/:requestId/accept', authRequired, (req, res) => {
  const requestItem = store.requests.find((r) => r.id === req.params.requestId);
  if (!requestItem) return res.status(404).json({ error: 'Request not found' });

  const providerId = req.user.id;
  requestItem.status = 'matched';

  const scheduledStart = req.body.scheduledStart || new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const scheduledEnd = req.body.scheduledEnd || new Date(new Date(scheduledStart).getTime() + 60 * 60 * 1000).toISOString();

  const session = {
    id: createId('sess'),
    requestId: requestItem.id,
    providerId,
    seekerId: requestItem.seekerId,
    scheduledStart,
    scheduledEnd,
    actualStart: null,
    actualEnd: null,
    status: 'pending',
    protectedMode: false,
    createdAt: nowIso()
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

  res.status(201).json({ session });
});

app.get('/api/sessions/me', authRequired, (req, res) => {
  const sessions = store.sessions.filter((s) => s.providerId === req.user.id || s.seekerId === req.user.id);
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
  res.json({ session });
});

app.post('/api/sessions/:sessionId/complete', authRequired, (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.seekerId !== req.user.id) return res.status(403).json({ error: 'Only seeker can complete' });

  const minDurationMs = 10 * 60 * 1000;
  const startedAt = new Date(session.actualStart || session.createdAt).getTime();
  if (Date.now() - startedAt < minDurationMs) {
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
    createdAt: nowIso()
  };

  if (analysis.flagged) {
    pushAnomaly(req.user.id, 'Rule 3 - Message pattern detection', analysis.severity, analysis.reason);
    recalcTrust(req.user.id);
  }

  store.messages.push(message);
  io.to(session.id).emit('message:new', message);
  res.status(201).json({ message });
});

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
    createdAt: nowIso()
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

  res.status(201).json({ review });
});

app.get('/api/dashboard/provider', authRequired, (req, res) => {
  const sessions = store.sessions.filter((s) => s.providerId === req.user.id);
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const pending = sessions.filter((s) => s.status === 'pending').length;
  const earnings = sessions.filter((s) => s.status === 'completed').reduce((acc) => acc + 25, 0);
  const ratingRows = store.reviews.filter((r) => r.revieweeId === req.user.id);
  const avgRating = ratingRows.length ? ratingRows.reduce((acc, r) => acc + r.rating, 0) / ratingRows.length : 0;

  res.json({
    totalEarnings: earnings,
    sessionsCompleted: completed,
    averageRating: avgRating,
    pendingRequests: pending,
    currentAvailability: req.user.availabilityStatus,
    trustScore: req.user.trustScore
  });
});

app.get('/api/dashboard/seeker', authRequired, (req, res) => {
  const sessions = store.sessions.filter((s) => s.seekerId === req.user.id);
  const active = sessions.filter((s) => s.status === 'active');
  const past = sessions.filter((s) => s.status === 'completed');

  res.json({
    activeSessions: active,
    pastSessions: past,
    spendingSummary: past.length * 25,
    favoriteProviders: []
  });
});

app.get('/api/admin/anomaly-flags', authRequired, (req, res) => {
  res.json({ flags: store.anomalyFlags });
});

app.post('/api/users/me/availability', authRequired, (req, res) => {
  const { availabilityStatus } = req.body;

  const activeProviderSession = store.sessions.find((s) => s.providerId === req.user.id && s.status === 'active');
  if (activeProviderSession) return res.status(400).json({ error: 'Provider cannot change availability during active session' });

  req.user.availabilityStatus = availabilityStatus;
  res.json({ user: sanitizeUser(req.user) });
});

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
      createdAt: nowIso()
    };

    store.messages.push(message);
    io.to(sessionId).emit('message:new', message);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`SkillRent backend running on http://localhost:${PORT}`);
});
