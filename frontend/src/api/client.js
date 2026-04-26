import { io } from 'socket.io-client';

const API = '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

let currentAccessToken = '';
let currentCsrfToken = '';
let socketInstance = null;

export function setAccessToken(token) {
  currentAccessToken = token || '';
}

export function getAccessToken() {
  return currentAccessToken;
}

export function setCsrfToken(token) {
  currentCsrfToken = token || '';
}

export function getCsrfToken() {
  return currentCsrfToken;
}

/**
 * Read the CSRF token directly from the cookie.
 * The server sets skillrent_csrf with httpOnly: false, so JS can read it.
 * This is the source of truth — the module-level variable is just a cache
 * that gets lost on Vite HMR reloads while the cookie survives.
 */
function getCsrfFromCookie() {
  if (typeof document === 'undefined') return '';
  const entry = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('skillrent_csrf='));
  return entry ? entry.slice('skillrent_csrf='.length) : '';
}

export async function api(path, { method = 'GET', body, token, signal } = {}) {
  const normalizedMethod = method.toUpperCase();

  // Prefer the in-memory token (freshest), fall back to cookie so that
  // Vite HMR reloads (which reset module state) don't break existing sessions.
  const csrfToken = currentCsrfToken || getCsrfFromCookie();

  const res = await fetch(`${API}${path}`, {
    method: normalizedMethod,
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...((token || currentAccessToken)
        ? { Authorization: `Bearer ${token || currentAccessToken}` }
        : {}),
      ...(normalizedMethod !== 'GET' && csrfToken
        ? { 'x-csrf-token': csrfToken }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(
      (data && (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))) ||
        `Request failed (${res.status})`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}