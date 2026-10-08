import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const TOKEN_STORAGE_KEY = 'smartcivic_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from token on startup
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await api.getMe();
        setUser(userData);
        setToken(storedToken);
      } catch (err) {
        console.warn('Session expired or invalid, logging out:', err);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const receivedToken = res.access_token;
    const receivedUser = res.user;

    localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);

    return receivedUser;
  };

  const register = async (name, email, password, confirmPassword) => {
    const res = await api.register(name, email, password, confirmPassword);
    const receivedToken = res.access_token;
    const receivedUser = res.user;

    localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);

    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(user && token),
    isAdmin: user?.role === 'ADMIN',
    isCitizen: user?.role === 'CITIZEN',
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
