'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiLogin,
  apiSignup,
  apiGetMe,
  setTokens,
  clearTokens,
  getAccessToken,
  type UserOut,
  type ApiError,
} from './api';

interface AuthContextValue {
  user: UserOut | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiGetMe();
      setUser(me);
    } catch {
      setUser(null);
      clearTokens();
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const tokens = await apiLogin(email, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    const me = await apiGetMe();
    setUser(me);
  };

  const signup = async (email: string, password: string) => {
    await apiSignup(email, password);
    // Auto-login after signup
    const tokens = await apiLogin(email, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    const me = await apiGetMe();
    setUser(me);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
