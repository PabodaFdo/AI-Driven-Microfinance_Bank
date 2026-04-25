import { getStoredToken, clearAuth } from './authService';

const STAFF_API_BASE = 'http://localhost:8080/api/v1/staff';

function getHeaders() {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
      window.location.reload();
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

export async function getAllStaff() {
  const res = await fetch(STAFF_API_BASE, {
    method: 'GET',
    headers: getHeaders(),
  });
  return parseResponse(res);
}

export async function getStaffById(id) {
  const res = await fetch(`${STAFF_API_BASE}/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return parseResponse(res);
}

export async function createStaff(payload) {
  const res = await fetch(STAFF_API_BASE, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function updateStaff(id, payload) {
  const res = await fetch(`${STAFF_API_BASE}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function updateOwnProfile(payload) {
  const res = await fetch(`${STAFF_API_BASE}/me`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function deactivateStaff(id, reason) {
  const res = await fetch(`${STAFF_API_BASE}/${id}?reason=${encodeURIComponent(reason)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return parseResponse(res);
}

export async function deleteStaffPermanently(id) {
  const res = await fetch(`${STAFF_API_BASE}/${id}/remove`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return parseResponse(res);
}

export async function changePassword(id, payload) {
  const res = await fetch(`${STAFF_API_BASE}/${id}/password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}
