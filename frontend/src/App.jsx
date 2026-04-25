import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import MarketplacePage from './pages/MarketplacePage';
import ProviderDetailPage from './pages/ProviderDetailPage';
import RequestsPage from './pages/RequestsPage';
import SessionsPage from './pages/SessionsPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/app" element={<Navigate to="/app/marketplace" replace />} />

              <Route
                path="/app/marketplace"
                element={
                  <ProtectedRoute requireOnboarded>
                    <MarketplacePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/providers/:id"
                element={
                  <ProtectedRoute requireOnboarded>
                    <ProviderDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/requests"
                element={
                  <ProtectedRoute requireOnboarded>
                    <RequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/sessions"
                element={
                  <ProtectedRoute requireOnboarded>
                    <SessionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/dashboard"
                element={
                  <ProtectedRoute requireOnboarded>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/profile"
                element={
                  <ProtectedRoute requireOnboarded>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
