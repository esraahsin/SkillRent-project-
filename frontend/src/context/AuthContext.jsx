import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken, setCsrfToken, getSocket, disconnectSocket } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await api('/auth/csrf').then((r) => setCsrfToken(r.csrfToken));
        const data = await api('/auth/refresh', { method: 'POST' });
        setToken(data.accessToken);
        setAccessToken(data.accessToken);
        setCsrfToken(data.csrfToken);
        setUser(data.user);
      } catch {
        // not logged in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (user && token) {
      const socket = getSocket();
      socket.emit('auth:identify', { userId: user.id });
    } else {
      disconnectSocket();
    }
  }, [user, token]);

  const login = useCallback(async ({ email, password }) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.accessToken);
    setAccessToken(data.accessToken);
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api('/auth/register', { method: 'POST', body: payload });
    setToken(data.accessToken);
    setAccessToken(data.accessToken);
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setToken('');
    setUser(null);
    setAccessToken('');
    setCsrfToken('');
    disconnectSocket();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, refreshUser, setUser }),
    [token, user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
