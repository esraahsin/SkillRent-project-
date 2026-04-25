# SkillRent — Pro Edition

**Your skills have value. Rent them now.**

SkillRent is an instant, local, AI-verified micro-skill marketplace. This repository contains the **full-stack web platform** rebuilt as a hackathon-ready "Pro Edition":

- **Frontend** — React 19 + Vite + Tailwind v4 + React Router + Lucide icons + Socket.io client
- **Backend** — Express 5 + Socket.io + JWT + bcrypt + rate limiting + helmet + zod validation
- **AI + Cyber layer** (placeholders, swappable with real models) — skill verification, semantic recommendations, anti-scam message inspection, trust-score engine

---

## ✨ What's inside

### Landing experience
- Animated gradient hero, stat counters, 8 category cards, features grid, testimonials, 3-step explainer, final CTA
- Dark mode by default with light mode toggle (theme persisted)

### Authentication
- Register / login with bcrypt + JWT (15m access) + httpOnly encrypted refresh cookie (7d)
- CSRF double-submit protection
- Rate-limited auth endpoints
- 3-step onboarding (role, skills with taxonomy, avatar)

### Marketplace
- Full-text + category + availability + price-range + sort search
- Provider cards with trust score gauge, AI confidence, live availability, hourly rate
- Provider detail page with reviews, skills, favorite toggle, "Request session" CTA
- Favorites stored per user

### Requests & Sessions
- Seeker posts requests (title, description, category, urgency, budget)
- AI recommends top providers for the request
- Provider applies → seeker accepts → session is created
- Session states: `pending → active → completed`
- Live chat (Socket.io) with scam detection and protected-mode payment-link blocking
- Minimum 10-minute session duration before completion
- Mutual 5-star reviews after completion
- Review bombing detection

### Notifications
- Real-time socket `notification:new` events
- REST endpoints to list / mark-read / mark-all-read
- Notification center in navbar with unread badge

### Dashboards
- Provider: earnings, sessions, rating, trust score, availability toggle
- Seeker: spending, active/past sessions, request count, favorites

### Security + Trust
- Helmet, CORS allow-list, CSRF, rate limits (general + auth)
- Encrypted refresh cookies (AES-256-GCM)
- Anomaly rules: account farming, review bombing, scam messages, IP abuse
- Trust score bands: green / yellow / orange / red
- AI-driven skill verification badge

---

## 🚀 Run locally

### Option A — Docker (recommended)
```bash
docker compose up --build
```
- Frontend → http://localhost:5173
- Backend  → http://localhost:4000

### Option B — Native

**Backend**
```bash
cd backend
npm install
npm run dev
```
Runs on http://localhost:4000

**Frontend** (in another terminal)
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173 and proxies `/api` + `/socket.io` to the backend.

---

## 🔑 Demo credentials (seeded)

On first backend boot, a realistic dataset is seeded automatically:

| Role     | Email                       | Password      | Notes                            |
|----------|-----------------------------|---------------|----------------------------------|
| Provider | `amira@skillrent.demo`      | `password123` | Full-stack dev in Cairo          |
| Provider | `omar@skillrent.demo`       | `password123` | Cybersecurity pentester          |
| Provider | `nadia@skillrent.demo`      | `password123` | UI/UX designer                   |
| Provider | `yusuf@skillrent.demo`      | `password123` | Data analyst                     |
| Provider | `layla@skillrent.demo`      | `password123` | AR/EN/FR translator              |
| Provider | `karim@skillrent.demo`      | `password123` | Math tutor                       |
| Provider | `hana@skillrent.demo`       | `password123` | Fitness coach                    |
| Provider | `tarek@skillrent.demo`      | `password123` | Video editor                     |
| Seeker   | `seeker@skillrent.demo`     | `password123` | Demo founder with open requests  |

All seeded users are pre-onboarded so they land directly on the marketplace.

---

## 🧠 AI & Cyber integration points

These live in `backend/src/services/`:

- `aiIntegration.js`
  - `verifySkillDescription(description)` → confidence, suggested category, provider badge eligibility
  - `semanticRecommendProviders(text, skills)` → scored matches
  - Wire these to a FastAPI + sentence-transformer service to upgrade to real NLP
- `cyberIntegration.js`
  - `inspectMessage(content)` → flags for payment/contact/bot patterns
  - `buildTrustScore(user, metrics)` → weighted score + band
  - Stored anomaly flags are exposed at `/api/admin/anomaly-flags`

---

## 🧱 Key API routes

```
GET    /api/health
GET    /api/taxonomy
GET    /api/stats/public

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/csrf

PATCH  /api/users/me
POST   /api/users/me/password
POST   /api/users/me/availability
POST   /api/onboarding

GET    /api/skills/me
POST   /api/skills
PATCH  /api/skills/:id
DELETE /api/skills/:id

GET    /api/providers
GET    /api/providers/search
GET    /api/providers/:id

POST   /api/requests
GET    /api/requests
POST   /api/requests/:id/apply
POST   /api/requests/:id/accept

GET    /api/sessions/me
POST   /api/sessions/:id/start
POST   /api/sessions/:id/complete
GET    /api/sessions/:id/messages
POST   /api/sessions/:id/messages

POST   /api/reviews
GET    /api/favorites
POST   /api/favorites/:providerId
DELETE /api/favorites/:providerId

GET    /api/notifications
POST   /api/notifications/:id/read
POST   /api/notifications/read-all

GET    /api/dashboard/provider
GET    /api/dashboard/seeker
GET    /api/admin/anomaly-flags
```

Socket.io events: `auth:identify`, `session:join`, `message:send`, `message:new`, `notification:new`, `session:created`, `session:started`, `session:completed`.

---

## 🗺️ Project structure

```
backend/
  src/
    server.js
    constants/taxonomy.js
    data/{store.js,seed.js}
    middleware/auth.js
    services/{aiIntegration.js,cyberIntegration.js}
    utils/tokens.js
frontend/
  src/
    App.jsx
    main.jsx
    index.css
    api/client.js
    lib/utils.js
    context/{AuthContext,ThemeContext,ToastContext}.jsx
    components/
      ui/{Avatar,Badge,Button,Card,Input,Select,Modal,Skeleton,TrustGauge,Logo}.jsx
      layout/{Navbar,Footer,ProtectedRoute,AppShell}.jsx
      features/{ProviderCard,RequestCard}.jsx
    pages/{Landing,Login,Register,Onboarding,Marketplace,ProviderDetail,Requests,Sessions,Dashboard,Profile,NotFound}Page.jsx
```

---

## 🧭 Next phase ideas
- Swap the in-memory store for PostgreSQL + Redis
- Replace AI placeholders with a real FastAPI + `sentence-transformers` microservice
- Add slot scheduling with auto-start / auto-end cron jobs
- Promote anomaly rules into admin triage workflow
- Stripe / local wallet integration on top of sessions
- Mobile app using the same REST + Socket API
