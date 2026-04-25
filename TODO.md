# SkillRent Pro Upgrade — TODO

## Backend
- [x] Add notifications & favorites to in-memory store
- [x] Add seed data (demo providers, requests, sessions, reviews)
- [x] Add new endpoints: /auth/me, /users/me (PATCH), /users/me/password, skills CRUD, providers/search, notifications, favorites, stats/public
- [x] Emit notifications via socket
- [x] Wire seed on server start

## Frontend — Setup
- [x] Update package.json (add lucide-react)
- [x] Update index.html (fonts, meta, favicon)
- [x] Rewrite index.css with design tokens & utilities
- [x] Update vite.config.js if needed

## Frontend — Core infra
- [x] api/client.js (API wrapper, socket, csrf)
- [x] context/AuthContext.jsx
- [x] context/ThemeContext.jsx
- [x] context/ToastContext.jsx
- [x] hooks/useAuth.js, useSocket.js, useToast.js, useDebounce.js
- [x] lib/utils.js

## Frontend — UI components
- [x] Button, Card, Input, Textarea, Select, Badge, Avatar, Modal, Skeleton, Toast, Spinner, TrustBadge
- [x] Navbar, Footer, ProtectedRoute, Layout

## Frontend — Pages
- [x] LandingPage
- [x] LoginPage
- [x] RegisterPage
- [x] OnboardingPage (multi-step)
- [x] MarketplacePage (search + filters)
- [x] ProviderDetailPage
- [x] RequestsPage
- [x] SessionsPage (chat + controls)
- [x] DashboardPage
- [x] ProfilePage
- [x] NotFoundPage

## Frontend — Feature components
- [x] ProviderCard, RequestCard, ChatWindow, ReviewForm, SkillPicker, StatCard, TrustGauge

## Wiring
- [x] Router + providers in App.jsx
- [x] main.jsx updated

## Docs
- [x] Update README with new flow/screens
