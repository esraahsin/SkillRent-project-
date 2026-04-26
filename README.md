# SkillRent — Pro Edition

> **Your skills have value. Rent them now.**

SkillRent is a full-stack, AI-powered micro-skill marketplace platform. It connects service providers (freelancers, tutors, coaches) with seekers in real-time, with intelligent skill verification, semantic matching, and anti-fraud measures built in.

This is the **Pro Edition** — a complete, production-ready hackathon/startup starter with:
- ✨ Modern React 19 frontend with real-time Socket.io
- 🚀 Express 5 backend with JWT + Socket.io  
- 🤖 Unified FastAPI AI service (skill verification, semantic matching, request categorization)
- 🛡️ Security hardening: CORS, CSRF, rate limiting, helmet, bcrypt + JWT auth
- 📊 Demo data with 9 pre-seeded users (providers + seeker)

---

## 📋 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Features](#-features)
3. [Tech Stack](#-tech-stack)
4. [Getting Started](#-getting-started)
5. [Project Structure](#-project-structure)
6. [API Reference](#-api-reference)
7. [AI Service](#-ai-service-deep-dive)
8. [Development Guide](#-development-guide)
9. [Deployment](#-deployment)
10. [Future Roadmap](#-future-roadmap)

---

## 🏗️ Architecture Overview

SkillRent is built as a **3-tier, event-driven system**:

```
┌─────────────────────────────────────────────────┐
│         Frontend (React 19 + Vite)              │
│  - Landing, Auth, Marketplace, Dashboard       │
│  - Real-time chat & notifications (Socket.io)  │
└──────────────────┬──────────────────────────────┘
                   │ REST + WebSocket
┌──────────────────▼──────────────────────────────┐
│     Backend (Express 5 + Socket.io)             │
│  - Auth, Users, Skills, Requests, Sessions     │
│  - Real-time events, notifications, messaging  │
│  - In-memory store (upgradeable to PostgreSQL)  │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (OpenAI-like interface)
┌──────────────────▼──────────────────────────────┐
│    AI Service (FastAPI + sentence-transformers)│
│  - Skill verification & quality scoring        │
│  - Semantic provider matching                  │
│  - Request auto-categorization                 │
│  - Trust score computation                     │
└─────────────────────────────────────────────────┘
```

### Key Design Decisions

- **In-memory store**: Fast iteration; swap to PostgreSQL + Redis for production
- **Socket.io for real-time**: Live chat, notifications, session updates without polling
- **JWT + httpOnly cookies**: Secure token strategy with CSRF protection
- **Modular AI layer**: FastAPI service is decoupled; easily swap for OpenAI, Anthropic, or custom models
- **Event-driven notifications**: Socket events trigger async notification creation

---

## ✨ Features

### 🏠 Landing Experience
- **Hero section** — Animated gradient, stat counters (users, skills, requests)
- **8 category cards** — Interactive showcase of skill categories
- **Features grid** — Trust, AI verification, real-time chat, secure payments
- **Testimonials carousel** — Social proof
- **3-step explainer** — How SkillRent works (post request → AI matches → book session)
- **Call-to-action buttons** — Get started, learn more
- **Dark/light mode** — Persisted user preference, toggleable navbar switch

### 🔐 Authentication & Onboarding
- **Register/Login** — Email + password with bcryptjs hashing
- **JWT strategy** — 15-minute access token + 7-day httpOnly refresh cookie
- **CSRF protection** — Double-submit token validation
- **Rate limiting** — 5 attempts/10 min for auth endpoints
- **3-step onboarding** — 
  1. Select role (provider or seeker)
  2. Add skills (with AI verification badge eligibility)
  3. Upload avatar & confirm

### 🛍️ Marketplace & Discovery
- **Full-text search** — Search providers by name, bio, skills
- **Filtering** — By category, availability, price range, rating
- **Sorting** — By rating, price, newest, reviews
- **Provider cards** — Avatar, name, hourly rate, trust score gauge, AI confidence badge, live availability
- **Provider detail page** — 
  - Skills with badges
  - Reviews & rating breakdown (5-star, 4-star, etc.)
  - Availability toggle (provider can go offline)
  - "Favorite" toggle (seeker-only)
  - "Request session" CTA

### 📬 Requests & Matching
- **Post a request** — Seekers can create with title, description, category, urgency level, budget
- **AI recommendations** — Semantic search matches top 5 providers based on skill descriptions
- **Apply to requests** — Providers can view open requests and apply
- **Accept applications** — Seeker reviews applicants and selects a provider
- **Auto-categorization** — Request title + description fed to AI for automatic category suggestion

### 💬 Live Sessions & Chat
- **Session states** — `pending → active → completed`
- **Live chat** — Real-time bidirectional messaging via Socket.io
- **Scam detection** — Messages flagged for payment-link patterns, external contact URLs
- **Protected mode** — Detected suspicious messages hidden from UI with admin flag
- **Minimum duration** — 10-minute sessions before completion allowed
- **Session timer** — Shows elapsed time and remaining time for active sessions
- **Message history** — Retrieve past messages from a session

### ⭐ Reviews & Trust
- **Mutual reviews** — Both parties review each other after session completion
- **5-star scale** — Required review text + ratings
- **Review bombing detection** — Flag accounts with >5 reviews in 24h on same provider
- **Trust score** — Weighted formula: (avg rating × 0.4) + (review count × 0.2) + (anomaly deductions × 0.4)
- **Color bands** — Green (>80), Yellow (60–80), Orange (40–60), Red (<40)

### 🔔 Notifications
- **Real-time events** — Socket.io `notification:new` broadcasts
- **Notification types** — Request accepted, session started, review received, message received
- **Notification center** — List all notifications with unread badge in navbar
- **Mark as read** — Individual or bulk read actions
- **Persistence** — Stored in backend; survives page refreshes

### 📊 Dashboards
- **Provider dashboard** — Total earnings, session count, avg rating, trust score, availability toggle
- **Seeker dashboard** — Total spending, active sessions, past sessions, request count, favorite count
- **Quick stats** — Session breakdown by status, reviews received

### 🛡️ Security & Trust Layer

#### Authentication
- bcryptjs password hashing (10 salt rounds)
- JWT access tokens (15 min expiry)
- httpOnly encrypted refresh cookies (AES-256-GCM, 7d expiry)
- CSRF double-submit token validation
- Rate limiting: 5 auth attempts per 10 min per IP

#### Network Security
- Helmet middleware — Sets security headers (HSTS, X-Frame-Options, CSP, etc.)
- CORS whitelist — Allow only frontend origin
- Content-type validation — Zod schema validation on all inputs

#### Trust & Anomaly Detection
- **Account farming detection** — Flag if 5+ registrations from same IP in 1 hour
- **Review bombing** — Flag if >5 reviews on same provider in 24h
- **Scam message patterns** — Flag messages containing payment links, external contact info
- **IP abuse** — Track login attempts; flag rapid changes across countries
- **Anomaly dashboard** — `/api/admin/anomaly-flags` exposes all flags

---

## 🛠️ Tech Stack

### Frontend
```
React 19.2.5          – Modern UI with hooks, React Router v7
Vite 8.0.10           – Ultra-fast build & dev server
Tailwind CSS 4.2.4    – Utility-first styling
React Router 7.14     – Client-side navigation
Socket.io Client 4.8  – Real-time WebSocket communication
Lucide React 0.460    – 460+ beautiful icons
```

### Backend
```
Express 5.1.0         – Minimal, fast HTTP server
Socket.io 4.8         – Real-time bidirectional communication
jsonwebtoken 9.0.2    – JWT creation & verification
bcryptjs 3.0.3        – Password hashing & validation
helmet 8.1.0          – Security headers middleware
express-rate-limit    – Request rate limiting
cookie-parser 1.4.7   – Secure cookie handling
cors 2.8.5            – Cross-Origin Resource Sharing
zod 4.1.12            – Runtime schema validation
```

### AI Service
```
FastAPI 0.115.0       – Modern async Python web framework
sentence-transformers – Semantic similarity via embeddings
scikit-learn 1.5.2    – Cosine similarity, ML utilities
PyTorch 2.4.1         – Deep learning backend for transformers
NumPy 1.26.4          – Numerical computing
Pydantic 2.9.2        – Data validation & serialization
uvicorn 0.30.6        – ASGI server for FastAPI
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** (for backend & frontend)
- **Python 3.10+** (for AI service)
- **Docker** (optional, recommended)

### Option A: Docker Compose (Recommended)

```bash
# Clone & navigate
cd SkillRent-project-

# Start all services
docker compose up --build
```

Services will be available at:
- **Frontend** → http://localhost:5173
- **Backend API** → http://localhost:4000
- **AI Service** → http://localhost:8000

### Option B: Local Native Setup

#### 1️⃣ Backend

```bash
cd backend
npm install
npm run dev
```

Runs on `http://localhost:4000`
- Seeds demo data on startup
- Database: in-memory (backend/src/data/store.js)

#### 2️⃣ Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`
- Proxies `/api` to backend
- Proxies `/socket.io` to backend WebSocket

#### 3️⃣ AI Service (new terminal, optional)

```bash
cd ai_service
pip install -r requirements.txt
python main.py
```

Runs on `http://localhost:8000`
- Serves `/verify-skill`, `/match-providers`, `/categorize-request` endpoints
- Downloads sentence-transformers model on first run (~500 MB)

### 🔑 Demo Credentials

All seeded users are pre-onboarded; login directly to marketplace:

| Role       | Email                    | Password      | Bio                         |
|------------|--------------------------|---------------|-----------------------------|
| **Provider** | amira@skillrent.demo    | password123   | Full-stack dev in Cairo     |
| **Provider** | omar@skillrent.demo     | password123   | Cybersecurity pentester     |
| **Provider** | nadia@skillrent.demo    | password123   | UI/UX designer              |
| **Provider** | yusuf@skillrent.demo    | password123   | Data analyst                |
| **Provider** | layla@skillrent.demo    | password123   | AR/EN/FR translator         |
| **Provider** | karim@skillrent.demo    | password123   | Math tutor                  |
| **Provider** | hana@skillrent.demo     | password123   | Fitness coach               |
| **Provider** | tarek@skillrent.demo    | password123   | Video editor                |
| **Seeker**   | seeker@skillrent.demo   | password123   | Founder with open requests  |

---

## 📁 Project Structure

```
SkillRent-project-/
│
├── frontend/                          # React 19 + Vite SPA
│   ├── src/
│   │   ├── main.jsx                   # Entry point
│   │   ├── App.jsx                    # Root component, routing
│   │   ├── index.css                  # Global Tailwind styles
│   │   ├── api/
│   │   │   └── client.js              # Axios HTTP client + Socket.io singleton
│   │   ├── lib/
│   │   │   └── utils.js               # Helper functions (cn, formatCurrency, etc.)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # User auth state (login, logout, refresh)
│   │   │   ├── ThemeContext.jsx       # Dark/light mode toggle
│   │   │   └── ToastContext.jsx       # Toast notifications
│   │   ├── components/
│   │   │   ├── ui/                    # Reusable UI building blocks
│   │   │   │   ├── Avatar.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Skeleton.jsx
│   │   │   │   ├── TrustGauge.jsx
│   │   │   │   └── ...
│   │   │   ├── layout/                # Structural components
│   │   │   │   ├── Navbar.jsx         # Header with auth, theme toggle, notifications
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── AppShell.jsx       # Layout wrapper
│   │   │   │   └── ProtectedRoute.jsx # Auth guard for pages
│   │   │   └── features/              # Feature-specific components
│   │   │       ├── ProviderCard.jsx
│   │   │       ├── RequestCard.jsx
│   │   │       ├── ReviewForm.jsx
│   │   │       └── ...
│   │   └── pages/                     # Full-page components
│   │       ├── LandingPage.jsx        # Hero, features, testimonials
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── OnboardingPage.jsx     # 3-step role → skills → avatar
│   │       ├── MarketplacePage.jsx    # Search, filter, provider cards
│   │       ├── ProviderDetailPage.jsx # Single provider, reviews, request CTA
│   │       ├── RequestsPage.jsx       # Post & view requests
│   │       ├── SessionsPage.jsx       # Active/past sessions, chat, reviews
│   │       ├── DashboardPage.jsx      # Provider/seeker stats
│   │       ├── ProfilePage.jsx        # Edit bio, avatar, skills
│   │       └── NotFoundPage.jsx
│   ├── vite.config.js                 # Proxy config for /api & /socket.io
│   └── package.json
│
├── backend/                           # Express 5 + Socket.io API
│   ├── src/
│   │   ├── server.js                  # Main Express app, Socket.io setup
│   │   ├── constants/
│   │   │   └── taxonomy.js            # Skill categories & subcategories
│   │   ├── data/
│   │   │   ├── store.js               # In-memory data store (users, skills, sessions, etc.)
│   │   │   └── seed.js                # Demo data initialization
│   │   ├── middleware/
│   │   │   └── auth.js                # JWT verification, CSRF token validation
│   │   ├── services/
│   │   │   ├── aiIntegration.js       # Calls FastAPI endpoints (skill verify, matching)
│   │   │   └── cyberIntegration.js    # Scam detection, trust score calculation
│   │   ├── utils/
│   │   │   └── tokens.js              # JWT & refresh token generation
│   │   └── routes/                    # API endpoint handlers (organized by feature)
│   │       ├── auth.js
│   │       ├── users.js
│   │       ├── skills.js
│   │       ├── providers.js
│   │       ├── requests.js
│   │       ├── sessions.js
│   │       ├── reviews.js
│   │       ├── favorites.js
│   │       ├── notifications.js
│   │       └── admin.js
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
│
├── ai_service/                        # FastAPI microservice
│   ├── main.py                        # Core FastAPI app
│   │   - GET /health                  # Health check
│   │   - POST /verify-skill           # Skill quality & confidence scoring
│   │   - POST /match-providers        # Semantic search for request matching
│   │   - POST /categorize-request     # Auto-categorization
│   ├── data/
│   │   └── generate_dataset.py        # Utility to generate training data
│   ├── train.py                       # Fine-tuning script for custom embedding model
│   ├── fine_tuned_model/              # Serialized sentence-transformer model (if fine-tuned)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md                      # AI service details
│
├── docker-compose.yml                 # Multi-container orchestration
└── README.md                          # This file

```

### Key Files Explained

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Express app initialization, Socket.io handlers, all route mounting |
| `backend/src/data/store.js` | In-memory "database" (maps users→skills→sessions→messages) |
| `backend/src/data/seed.js` | 9 demo users with realistic skills, reviews, messages |
| `backend/src/middleware/auth.js` | JWT verification, CSRF token checks |
| `backend/src/services/aiIntegration.js` | HTTP calls to FastAPI endpoints |
| `backend/src/services/cyberIntegration.js` | Scam message detection, trust score formula |
| `frontend/src/api/client.js` | Axios + Socket.io client setup, auto-refresh on 401 |
| `frontend/src/context/AuthContext.jsx` | Global user auth state |
| `ai_service/main.py` | FastAPI routes, sentence-transformers model loading, inference |

---

## 🔌 API Reference

### Health & Public
```
GET  /api/health                       # Status check
GET  /api/taxonomy                     # Skill categories (8 cat × subcategories)
GET  /api/stats/public                 # Landing stats (user count, reviews, earnings)
```

### Authentication
```
POST /api/auth/register                # Create account (email, password, role)
POST /api/auth/login                   # Get access token + refresh cookie
POST /api/auth/refresh                 # Exchange refresh cookie for new access token
POST /api/auth/logout                  # Invalidate refresh cookie
GET  /api/auth/me                      # Current user profile
GET  /api/auth/csrf                    # Get CSRF token for forms
```

### User Profile
```
PATCH /api/users/me                    # Update bio, avatar, hourly rate (provider)
POST  /api/users/me/password           # Change password
POST  /api/users/me/availability       # Toggle provider availability (online/offline)
```

### Onboarding
```
POST  /api/onboarding                  # Complete 3-step setup (role, skills, avatar)
```

### Skills
```
GET   /api/skills/me                   # User's skills (with AI verification status)
POST  /api/skills                      # Add skill (calls AI for verification)
PATCH /api/skills/:id                  # Update skill
DELETE /api/skills/:id                 # Remove skill
```

### Providers & Marketplace
```
GET   /api/providers                   # List all providers (paginated)
GET   /api/providers/search             # Search: filters, sort, text search
GET   /api/providers/:id                # Single provider profile + reviews
```

### Requests & Matching
```
POST  /api/requests                    # Create request (title, description, category, budget)
GET   /api/requests                    # List requests by seeker/provider
POST  /api/requests/:id/apply          # Provider applies to request
POST  /api/requests/:id/accept         # Seeker accepts application → creates session
```

### Sessions & Chat
```
GET   /api/sessions/me                 # User's sessions (active & completed)
POST  /api/sessions/:id/start          # Start session timer
POST  /api/sessions/:id/complete       # Mark session complete (if ≥10 min elapsed)
GET   /api/sessions/:id/messages       # Retrieve chat history
POST  /api/sessions/:id/messages       # Send message (scam detection applied)
```

### Reviews
```
POST  /api/reviews                     # Submit mutual review after session
GET   /api/reviews/:providerId         # Get reviews for a provider
```

### Favorites
```
GET   /api/favorites                   # Seeker's favorite providers
POST  /api/favorites/:providerId       # Add to favorites
DELETE /api/favorites/:providerId      # Remove from favorites
```

### Notifications
```
GET   /api/notifications               # List user's notifications
POST  /api/notifications/:id/read      # Mark notification as read
POST  /api/notifications/read-all      # Mark all as read
```

### Dashboard
```
GET   /api/dashboard/provider          # Provider stats (earnings, sessions, rating)
GET   /api/dashboard/seeker            # Seeker stats (spending, active sessions, favorites)
```

### Admin
```
GET   /api/admin/anomaly-flags         # Anomaly detection flags (review bombing, account farming, etc.)
```

### Socket.io Events
```
# Authentication
auth:identify                          # Client identifies with JWT token

# Sessions & Chat
session:join                           # Client joins session room
message:send                           # Client sends message
message:new                            # Server broadcasts new message
session:created                        # New session created
session:started                        # Session timer started
session:completed                      # Session completed

# Notifications
notification:new                       # New notification broadcast
```

---

## 🤖 AI Service Deep Dive

The **AI Service** is a FastAPI microservice that powers intelligent skill verification, provider matching, and request categorization. It runs separately from the backend and is accessed via HTTP.

### Architecture

```
Sentence-Transformers (all-MiniLM-L6-v2)
  ↓
  Encodes skill descriptions & request text into 384-dim embeddings
  ↓
Cosine similarity scoring against category/subcategory centroids
  ↓
Returns confidence, suggestions, badges
```

### Endpoints

#### 1. POST `/verify-skill`
Verifies a skill description and returns quality metrics.

**Request:**
```json
{
  "description": "I have 5 years experience with React, Node.js, and MongoDB building full-stack web applications",
  "category": "Tech & Development",
  "subcategory": "Web Development"
}
```

**Response:**
```json
{
  "confidence": 0.92,
  "suggestedCategory": "Tech & Development",
  "suggestedSubcategory": "Web Development",
  "alternatives": ["Software Engineering", "Mobile Development"],
  "providerBadgeEligible": true,
  "qualityFlags": []
}
```

**Quality Flags:**
- `description_too_short` — <30 chars
- `description_brief` — <80 chars (warning)
- `repetitive_text` — >50% duplicate words
- `too_generic` — Generic phrasing without specifics

**Badge Eligibility:**
- Confidence ≥ 0.62
- No "too_short" or "too_generic" flags
- Shows verified badge on provider profile

#### 2. POST `/match-providers`
Semantic search to find providers matching a request.

**Request:**
```json
{
  "requestText": "I need help building a React app with user authentication",
  "providerSkills": [
    {
      "skillId": "s1",
      "userId": "u1",
      "description": "Full-stack React development with Node.js backend",
      "category": "Tech & Development",
      "subcategory": "Web Development"
    }
  ],
  "topK": 5
}
```

**Response:**
```json
{
  "matches": [
    {
      "providerId": "u1",
      "skillId": "s1",
      "score": 0.89,
      "matchReason": "Matched on: React, Node.js, authentication"
    }
  ]
}
```

**Scoring:**
- Cosine similarity of request text vs. skill description
- Normalized to [0, 1]
- Returns top K matches sorted by score

#### 3. POST `/categorize-request`
Auto-categorizes a request based on title + description.

**Request:**
```json
{
  "title": "Help with React component design",
  "description": "I need help creating reusable UI components for my dashboard"
}
```

**Response:**
```json
{
  "category": "Tech & Development",
  "subcategory": "Web Development",
  "confidence": 0.87,
  "alternatives": [
    {"category": "Design & Creativity", "subcategory": "UI/UX Design", "score": 0.64}
  ]
}
```

### Taxonomy

The AI service uses a fixed taxonomy mirrored from the backend:

**8 Main Categories:**
1. Tech & Development
2. Design & Creativity
3. Languages & Translation
4. Education & Tutoring
5. Business & Finance
6. Home & Lifestyle
7. Health & Wellness
8. Music & Arts

Each category has 5-8 subcategories (e.g., Web Development, Mobile Development, Data Analysis under Tech & Development).

### Embedding Strategy

**Category Anchors** — Rich, descriptive text for each category:
```
"Tech & Development": "software engineer programmer full-stack developer coding web apps mobile applications database cloud computing algorithms debugging"
```

**Subcategory Anchors** — Detailed anchors for each subcategory:
```
"Web Development": "React Vue Angular Node Express REST API JavaScript TypeScript HTML CSS frontend backend fullstack web application deployment Vercel"
```

**Centroid Caching** — Embeddings computed once at startup and cached in memory for fast inference.

### Model Options

- **Default** — `sentence-transformers/all-MiniLM-L6-v2` (22 MB, 384 dims, fast)
- **Fine-tuned** — Optional custom model trained on SkillRent data; specify via `MODEL_PATH` env var

### Integration with Backend

**Backend calls:**

```javascript
// In backend/src/services/aiIntegration.js
async function verifySkillDescription(description, category, subcategory) {
  const res = await fetch(`${AI_SERVICE_URL}/verify-skill`, {
    method: 'POST',
    body: JSON.stringify({ description, category, subcategory })
  });
  return res.json();
}

async function semanticRecommendProviders(requestText, providerSkills) {
  const res = await fetch(`${AI_SERVICE_URL}/match-providers`, {
    method: 'POST',
    body: JSON.stringify({ requestText, providerSkills, topK: 5 })
  });
  return res.json();
}
```

---

## 👨‍💻 Development Guide

### Frontend Development

**Setup:**
```bash
cd frontend
npm install
npm run dev
```

**Project structure:**
- `/src/pages/` — Full-page components for each route
- `/src/components/ui/` — Reusable building blocks (Button, Card, Input, etc.)
- `/src/components/layout/` — AppShell, Navbar, Footer, ProtectedRoute
- `/src/context/` — Global state (Auth, Theme, Toast)
- `/src/api/` — HTTP + Socket.io client

**Key patterns:**
- Use `AuthContext` for user state and auth logic
- Use `ToastContext` for in-app notifications
- Fetch provider-specific data on detail pages (no pre-fetching)
- Socket.io listeners added in `useEffect` cleanup

**Common tasks:**
- Add a new page: Create file in `/pages/`, add route in `App.jsx`
- Add a UI component: Create reusable component in `/ui/`, use in pages
- Update API calls: Modify `/api/client.js` to add new endpoints

### Backend Development

**Setup:**
```bash
cd backend
npm install
npm run dev
```

**Project structure:**
- `server.js` — Main app, middleware setup, route mounting, Socket.io
- `/data/store.js` — In-memory "database" (maps, arrays)
- `/data/seed.js` — Initial data
- `/middleware/auth.js` — JWT + CSRF verification
- `/services/` — Business logic (AI calls, trust scoring)
- `/routes/` — Endpoint handlers organized by feature

**Key patterns:**
- All routes return `{ success: true, data: ... }` or `{ success: false, error: ... }`
- Auth middleware validates JWT, attaches `req.user`
- Socket.io handlers in `server.js` for real-time events
- Use `zod` for input validation

**Common tasks:**
- Add new API endpoint: Create handler in `/routes/`, mount in `server.js`
- Add validation: Use `zod.object().parse()` in route handler
- Add Socket.io event: Add listener in `io.on('connection', ...)` in `server.js`
- Test rate limiting: Use `express-rate-limit` middleware on routes

### AI Service Development

**Setup:**
```bash
cd ai_service
pip install -r requirements.txt
python main.py
```

**Key files:**
- `main.py` — FastAPI app, routes, inference functions
- `train.py` — Fine-tuning script
- `data/generate_dataset.py` — Dataset generation utility

**Model architecture:**
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
embeddings = model.encode(['text1', 'text2'])  # Shape: (n, 384)

# Cosine similarity
from sklearn.metrics.pairwise import cosine_similarity
scores = cosine_similarity(query_emb, skill_embs)  # Shape: (1, n)
```

**Common tasks:**
- Add new endpoint: Define Pydantic model, create `/route` function
- Adjust taxonomy: Update `TAXONOMY` and anchor dicts in `main.py`
- Fine-tune model: Use `train.py` script, save to `fine_tuned_model/`
- Debug inference: Add logging with `logger.info()`, check centroid cache

---

## 🐳 Deployment

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - AI_SERVICE_URL=http://ai_service:8000
  ai_service:
    build: ./ai_service
    ports:
      - "8000:8000"
```

**Start:**
```bash
docker compose up --build
```

### Production Deployment

**Frontend:**
- Build with Vite: `npm run build` → `dist/` folder
- Deploy to Vercel, Netlify, or static hosting (S3 + CloudFront)
- Set `VITE_API_URL` env var for backend URL

**Backend:**
- Swap in-memory store for PostgreSQL
- Add Redis for session caching
- Use PM2 or systemd for process management
- Run behind Nginx/HAProxy with SSL
- Set `JWT_SECRET`, `DB_URL`, `AI_SERVICE_URL` env vars

**AI Service:**
- Use `gunicorn` + uvicorn workers: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`
- Cache model in Docker image or pre-download
- Monitor GPU/CPU usage for scaling

---

## 🗺️ Future Roadmap

### Phase 1: Database & Persistence
- [ ] Replace in-memory store with PostgreSQL
- [ ] Add Redis for session caching & rate-limit tracking
- [ ] Implement connection pooling (pgbouncer)

### Phase 2: Payment & Monetization
- [ ] Integrate Stripe for escrow payments
- [ ] Add wallet/balance system
- [ ] Implement commission splits (platform takes 10-20%)
- [ ] Add invoice generation

### Phase 3: Scheduling & Automation
- [ ] Calendar booking with time slots
- [ ] Auto-start/auto-end sessions (cron jobs)
- [ ] Recurring requests (weekly tutoring, etc.)
- [ ] Timezone-aware scheduling

### Phase 4: Admin & Moderation
- [ ] Admin dashboard for anomaly review
- [ ] Triage workflow for suspicious users
- [ ] Appeal mechanism for account restrictions
- [ ] Bulk operations (suspend, archive, export)

### Phase 5: AI & Personalization
- [ ] Replace placeholder AI with fine-tuned model
- [ ] Swap sentence-transformers for OpenAI embeddings
- [ ] Add LLM-powered request summaries
- [ ] Build ML ranking for feed personalization

### Phase 6: Mobile & Expansion
- [ ] React Native mobile app (iOS/Android)
- [ ] Push notifications (FCM, APNs)
- [ ] Offline mode with sync
- [ ] Geo-location based discovery

### Phase 7: Community & Social
- [ ] User profiles with portfolio
- [ ] Skill endorsements
- [ ] Follower system
- [ ] Public skill showcase (skills feed)

### Phase 8: Analytics & Insights
- [ ] Dashboards for providers (earnings trends, review trends)
- [ ] Platform analytics (GMV, user growth, churn)
- [ ] Segment analysis (top skills, busiest times)
- [ ] Export reports (CSV, PDF)

---

## 📝 License

MIT

---

## 🙋 Support & Contribution

For issues, bug reports, or feature requests, please open a GitHub issue.

### Quick Help
- **Frontend not loading?** Check Vite config proxy settings
- **API 401 errors?** Verify JWT refresh token in cookies
- **Socket.io disconnected?** Check CORS whitelist in backend
- **AI service timeout?** Check MODEL_PATH env var, ensure model is downloaded

---

**Built with ❤️ for the hackathon / startup community.**
