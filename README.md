# SkillRent Project — Web MVP (Hackathon Phase 1)

This repository now contains the **web solution first phase** for Skill Rent:
- `frontend/` — React + Tailwind web app (mobile-first layout)
- `backend/` — Express + Socket.io API

## Positioning
**Skill Rent = instant, local, verified micro-skill exchange**

Tagline: **"Your skills have value. Rent them now."**

## What is implemented in this phase

### ✅ Authentication & Onboarding
- Register with: name, email, password, city, bio
- Password hashing with bcrypt
- JWT access token (15m)
- Refresh token (7d) in **httpOnly cookie**
- 3-step style onboarding support:
  - mode: provider / seeker / both
  - provider skill selection from controlled taxonomy
  - avatar URL
- Email verification is mocked with console output

### ✅ Provider skill profiles
- Controlled taxonomy categories + subcategories
- Per-skill card fields:
  - skill name/category
  - hourly rate
  - response time
  - availability status
  - AI confidence placeholder score
- "Available Now" status is highlighted

### ✅ Request and session flow
- Seeker posts request (title, description, category, urgency, optional budget)
- Provider applies and can accept to create session
- Session statuses: pending, active, completed

### ✅ Session-scoped messaging
- Socket.io + REST chat storage
- Messaging only tied to session participants
- Flagging support for suspicious content

### ✅ Reviews and dashboards
- Mutual review endpoint after completion
- Provider dashboard: earnings, sessions, ratings, pending, availability
- Seeker dashboard: active/past sessions, spending, favorites placeholder

## AI & Cyber placeholders (prepared for phase 2)
- `backend/src/services/aiIntegration.js`
  - `verifySkillDescription(...)`
  - `semanticRecommendProviders(...)`
  - marked with integration comments for FastAPI model service
- `backend/src/services/cyberIntegration.js`
  - trust score computation
  - suspicious message detection
  - anomaly-compatible helpers
- Rule-based anomaly flags are stored and exposed for admin dashboard feed

## Run with containers

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

Vite proxy routes `/api` and Socket.io traffic from the frontend container to the backend container.

## Optional non-container run

### 1) Backend
```bash
cd backend
npm install
npm run dev
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

## Suggested next phase (AI + Cyber)
- Replace AI placeholders with Python FastAPI microservice + sentence-transformer
- Replace in-memory store with PostgreSQL + Redis
- Expand anomaly rules into middleware + admin triage workflows
- Add slot booking scheduler with auto-start/auto-end jobs
