const bcrypt = require('bcryptjs');
const { store, createId, nowIso } = require('./store');

async function seed() {
  if (store.users.length > 0) return;

  const passwordHash = await bcrypt.hash('password123', 10);

  const demoUsers = [
    {
      name: 'Sarah Martinez',
      email: 'sarah@skillrent.dev',
      city: 'Cairo',
      bio: 'Full-stack developer with 6 years of experience building scalable web apps with React, Node and PostgreSQL.',
      role: 'both',
      avatarUrl: 'https://i.pravatar.cc/150?img=47',
      skill: {
        category: 'Tech & Development',
        subcategory: 'Web Development',
        description: 'React, Next.js, Node.js expert. I build production-ready web apps and can debug your stack in under an hour.',
        hourlyRate: 45,
        responseTime: 'within 10 min',
      },
    },
    {
      name: 'Ahmed Khalil',
      email: 'ahmed@skillrent.dev',
      city: 'Alexandria',
      bio: 'Cybersecurity consultant specializing in web app pentesting and secure code review.',
      role: 'both',
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
      skill: {
        category: 'Tech & Development',
        subcategory: 'Cybersecurity',
        description: 'OSCP certified pentester. I audit your app for OWASP Top 10, misconfigurations and help you ship securely.',
        hourlyRate: 60,
        responseTime: 'within 30 min',
      },
    },
    {
      name: 'Linda Chen',
      email: 'linda@skillrent.dev',
      city: 'Giza',
      bio: 'Senior product designer focused on mobile-first UX and design systems.',
      role: 'both',
      avatarUrl: 'https://i.pravatar.cc/150?img=32',
      skill: {
        category: 'Design & Creativity',
        subcategory: 'UI/UX Design',
        description: 'I design clean, conversion-focused interfaces. Figma, design systems, accessibility — lets shape your product.',
        hourlyRate: 40,
        responseTime: 'within 20 min',
      },
    },
    {
      name: 'Yusuf Ibrahim',
      email: 'yusuf@skillrent.demo',
      city: 'Cairo',
      bio: 'Data analyst turning raw numbers into actionable dashboards.',
      role: 'provider',
      avatarUrl: 'https://i.pravatar.cc/150?img=15',
      skill: {
        category: 'Tech & Development',
        subcategory: 'Data Analysis',
        description: 'Excel, SQL, Python and Power BI. I build dashboards that answer business questions, fast.',
        hourlyRate: 30,
        responseTime: 'within 15 min',
      },
    },
    {
      name: 'Layla Mansour',
      email: 'layla@skillrent.demo',
      city: 'Beirut',
      bio: 'Multilingual translator (AR/EN/FR) with 8 years of live interpretation experience.',
      role: 'provider',
      avatarUrl: 'https://i.pravatar.cc/150?img=45',
      skill: {
        category: 'Languages & Translation',
        subcategory: 'Live Translation',
        description: 'Live interpretation for meetings, interviews and events. Arabic ↔ English ↔ French.',
        hourlyRate: 35,
        responseTime: 'within 5 min',
      },
    },
    {
      name: 'Karim Adel',
      email: 'karim@skillrent.demo',
      city: 'Cairo',
      bio: 'Math tutor helping students ace calculus, linear algebra and statistics.',
      role: 'provider',
      avatarUrl: 'https://i.pravatar.cc/150?img=52',
      skill: {
        category: 'Education & Tutoring',
        subcategory: 'Math Tutoring',
        description: 'PhD candidate. I tutor high school + university math with clear explanations and worked examples.',
        hourlyRate: 20,
        responseTime: 'within 15 min',
      },
    },
    {
      name: 'Hana Saeed',
      email: 'hana@skillrent.demo',
      city: 'Dubai',
      bio: 'Certified personal trainer and nutritionist.',
      role: 'provider',
      avatarUrl: 'https://i.pravatar.cc/150?img=49',
      skill: {
        category: 'Health & Wellness',
        subcategory: 'Fitness Coaching',
        description: 'Personalized workout & nutrition plans. Live coaching sessions over video.',
        hourlyRate: 25,
        responseTime: 'within 20 min',
      },
    },
    {
      name: 'Tarek Hosny',
      email: 'tarek@skillrent.demo',
      city: 'Cairo',
      bio: 'Pro video editor — YouTube, social ads, documentaries.',
      role: 'provider',
      avatarUrl: 'https://i.pravatar.cc/150?img=14',
      skill: {
        category: 'Tech & Development',
        subcategory: 'Video Editing',
        description: 'Premiere Pro + After Effects specialist. Fast turnaround for shorts, reels and long-form edits.',
        hourlyRate: 28,
        responseTime: 'within 25 min',
      },
    },
  ];

  const createdUsers = demoUsers.map((u) => {
    const user = {
      id: createId('user'),
      name: u.name,
      email: u.email,
      passwordHash,
      city: u.city,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      role: u.role,
      onboardingDone: true,
      isEmailVerified: true,
      trustScore: { value: 78, band: 'green' },
      availabilityStatus: 'available_now',
      createdAt: nowIso(),
    };
    store.users.push(user);

    store.skills.push({
      id: createId('skill'),
      userId: user.id,
      category: u.skill.category,
      subcategory: u.skill.subcategory,
      description: u.skill.description,
      hourlyRate: u.skill.hourlyRate,
      responseTime: u.skill.responseTime,
      availabilityStatus: 'available_now',
      aiConfidenceScore: 0.87,
      aiSuggestedCategory: u.skill.subcategory,
      isVerified: true,
      avgRating: 4.6 + Math.random() * 0.4,
      completedSessions: Math.floor(Math.random() * 40) + 5,
      createdAt: nowIso(),
    });

    return user;
  });

  // Sample open requests from a fake seeker
  const seeker = {
    id: createId('user'),
    name: 'Demo Seeker',
    email: 'seeker@skillrent.demo',
    passwordHash,
    city: 'Cairo',
    bio: 'Founder looking to build an MVP with the help of great freelancers.',
    avatarUrl: 'https://i.pravatar.cc/150?img=20',
    role: 'seeker',
    onboardingDone: true,
    isEmailVerified: true,
    trustScore: { value: 62, band: 'yellow' },
    availabilityStatus: 'offline',
    createdAt: nowIso(),
  };
  store.users.push(seeker);

  const sampleRequests = [
    {
      title: 'Need React dev to fix auth bug',
      description: 'Our JWT refresh loop is broken. Looking for someone to jump on a 1-hour pair session and fix it.',
      category: 'Tech & Development',
      subcategory: 'Web Development',
      urgency: 'immediate',
      budget: 60,
    },
    {
      title: 'Logo + brand identity for a coffee shop',
      description: 'New coffee shop launching next month. Need a minimalistic logo and color palette.',
      category: 'Design & Creativity',
      subcategory: 'Brand Identity',
      urgency: 'within 3 days',
      budget: 150,
    },
    {
      title: 'Arabic → English translation for a contract',
      description: '6-page legal document. Need fast accurate translation.',
      category: 'Languages & Translation',
      subcategory: 'English',
      urgency: 'within today',
      budget: 80,
    },
  ];

  sampleRequests.forEach((r) => {
    store.requests.push({
      id: createId('req'),
      seekerId: seeker.id,
      ...r,
      status: 'open',
      applicants: [],
      recommendedProviders: [],
      createdAt: nowIso(),
    });
  });

  // A completed session + review for demo dashboard
  if (createdUsers.length >= 1) {
    const provider = createdUsers[0];
    const sessionId = createId('sess');
    store.sessions.push({
      id: sessionId,
      requestId: null,
      providerId: provider.id,
      seekerId: seeker.id,
      scheduledStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      actualStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      actualEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      agreedAmount: 45,
      status: 'completed',
      protectedMode: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    store.reviews.push({
      id: createId('rev'),
      sessionId,
      reviewerId: seeker.id,
      revieweeId: provider.id,
      rating: 5,
      comment: 'Incredible work. Fixed the bug in 20 minutes and explained everything clearly.',
      isSuspicious: false,
      createdAt: nowIso(),
    });
  }

  console.log(`[seed] Loaded ${store.users.length} demo users, ${store.skills.length} skills, ${store.requests.length} requests`);
}

module.exports = { seed };
