/**
 * AuthContext
 * -----------
 * Provides authentication state to the entire app.
 *
 * Stores:
 * - user: the logged-in user object (or null)
 * - token: JWT access token (or null)
 * - login(): call after successful login to save token + user
 * - logout(): clear everything and redirect
 * - loading: true while checking for an existing token on mount
 *
 * The token is persisted in localStorage so the user stays logged in
 * after refreshing the page.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if there's a saved token and validate it
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      // Optionally re-validate by calling /auth/me
      authAPI
        .me()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch(() => {
          // Token invalid — clear
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Both /auth/login and /auth/register return the same TokenResponse
  // { access_token, token_type, user }, so one helper stores the session.
  const saveSession = (data) => {
    const { access_token, user: userData } = data;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    return saveSession(res.data);
  };

  // Backend assigns the default Employee/staff role to every self-registered user.
  const register = async ({ username, email, password }) => {
    const res = await authAPI.register({ username, email, password });
    return saveSession(res.data);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Check if user has a specific role (case-insensitive & supports staff/employee aliases)
  const hasRole = (...roles) => {
    if (!user) return false;
    const roleName = (user.role_name || user.role?.name || '').toLowerCase();
    return roles.some((r) => {
      const target = r.toLowerCase();
      if (target === roleName) return true;
      if (['staff', 'employee'].includes(target) && ['staff', 'employee'].includes(roleName)) return true;
      return false;
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
