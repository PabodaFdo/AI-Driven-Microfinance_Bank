import { getStoredToken, clearAuth, getCurrentUser } from './authService';

const API_BASE = 'http://localhost:8080/api/v1';

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
      // Redirect to login or reload page
      window.location.href = '/login';
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

export async function getMyProfile() {
  try {
    return await getCurrentUser();
  } catch (error) {
    throw new Error('Failed to load profile: ' + error.message);
  }
}

export async function updateMyProfile(profileData) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const res = await fetch(`${API_BASE}/staff/me`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      fullName: profileData.fullName,
      phone: profileData.phone,
      address: profileData.address
    }),
  });

  return parseResponse(res);
}

export async function changeMyPassword(currentUserId, passwordData) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const res = await fetch(`${API_BASE}/staff/${currentUserId}/password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    }),
  });

  return parseResponse(res);
}