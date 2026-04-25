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

export async function api(path, { method = 'GET', body, token, signal } = {}) {
  const normalizedMethod = method.toUpperCase();
  const res = await fetch(`${API}${path}`, {
    method: normalizedMethod,
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...((token || currentAccessToken)
        ? { Authorization: `Bearer ${token || currentAccessToken}` }
        : {}),
      ...(normalizedMethod !== 'GET' && currentCsrfToken
        ? { 'x-csrf-token': currentCsrfToken }
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
