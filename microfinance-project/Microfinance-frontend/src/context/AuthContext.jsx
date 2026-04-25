import { createContext, useContext, useMemo, useState } from 'react';
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '../services/authService';
import { normalizeRole } from '../utils/permissions';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    role: normalizeRole(user.role),
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(normalizeUser(getStoredUser()));

  const loginSuccess = ({ token: nextToken, user: nextUser }) => {
    const normalizedUser = normalizeUser(nextUser);
    setStoredToken(nextToken);
    setStoredUser(normalizedUser);
    setToken(nextToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    clearAuth();
    setToken('');
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    loginSuccess,
    logout,
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
