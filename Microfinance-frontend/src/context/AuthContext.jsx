import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  // ✅ Initialize as unauthenticated
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // ✅ Track whether hydration from localStorage is complete
  const [authReady, setAuthReady] = useState(false);

  // ✅ On mount, hydrate auth from localStorage if valid session exists
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = normalizeUser(getStoredUser());

    if (storedToken && storedUser) {
      // Valid session found - restore it
      setToken(storedToken);
      setUser(storedUser);
    } else {
      // No valid session - clear any stale data
      clearAuth();
      setToken(null);
      setUser(null);
    }

    // Mark hydration complete - now safe to render app
    setAuthReady(true);
  }, []);

  const loginSuccess = ({ token: nextToken, user: nextUser }) => {
    const normalizedUser = normalizeUser(nextUser);
    setStoredToken(nextToken);
    setStoredUser(normalizedUser);
    setToken(nextToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    authReady,
    isAuthenticated: Boolean(token && user),
    loginSuccess,
    logout,
  }), [token, user, authReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
