import { normalizeRole } from '../utils/permissions.js';
const AUTH_BASE = 'http://localhost:8080/api/v1/auth';

const STORAGE_KEYS = {
  token: 'auth_token',
  user: 'auth_user',
};

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEYS.token) || sessionStorage.getItem(STORAGE_KEYS.token) || '';
}

export function setStoredToken(token) {
  if (token) {
    // CHANGED: single source of truth in localStorage
    localStorage.setItem(STORAGE_KEYS.token, token);
    sessionStorage.removeItem(STORAGE_KEYS.token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
    sessionStorage.removeItem(STORAGE_KEYS.token);
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user) || sessionStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    if (!user) return null;
    const normalizedUser = {
      ...user,
      role: normalizeRole(user.role),
    };
    // CHANGED: normalize and migrate to localStorage to clear legacy cache issues
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalizedUser));
    sessionStorage.removeItem(STORAGE_KEYS.user);
    return normalizedUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    const normalizedUser = {
      ...user,
      role: normalizeRole(user.role),
    };
    // CHANGED: single source of truth in localStorage
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalizedUser));
    sessionStorage.removeItem(STORAGE_KEYS.user);
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
    sessionStorage.removeItem(STORAGE_KEYS.user);
  }
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  sessionStorage.removeItem(STORAGE_KEYS.token);
  sessionStorage.removeItem(STORAGE_KEYS.user);
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearAuth();
    }
    const message = typeof data === 'object' && data?.message
      ? data.message
      : typeof data === 'string' && data
        ? data
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export async function login(email, password) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseResponse(res);

  if (data && data.token) {
    setStoredToken(data.token);
    const sourceUser = data.user || data;
    const user = {
      id: sourceUser.id,
      email: sourceUser.email,
      username: sourceUser.username,
      fullName: sourceUser.fullName,
      role: normalizeRole(sourceUser.role),
      branch: sourceUser.branch,
    };
    setStoredUser(user);
    return { token: data.token, user };
  }

  throw new Error('Invalid login response from server');
}

export async function getCurrentUser() {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const res = await fetch(`${AUTH_BASE}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(res);
}

export async function logout() {
  clearAuth();
}

export async function forgotPassword(email) {
  const res = await fetch(`${AUTH_BASE}/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await parseResponse(res);
  return data;
}

export async function resetPassword(token, newPassword, confirmPassword) {
  const res = await fetch(`${AUTH_BASE}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword, confirmPassword }),
  });

  const data = await parseResponse(res);
  return data;
}

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const res = await fetch(`${AUTH_BASE}/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  const data = await parseResponse(res);
  return data;
}
