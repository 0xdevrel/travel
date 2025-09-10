'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  walletAddress: string;
  username?: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (userData: { walletAddress: string; username?: string }) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('travel-ai-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (userData: { walletAddress: string; username?: string }) => {
    const user = {
      walletAddress: userData.walletAddress,
      username: userData.username,
      isAuthenticated: true,
    };
    setUser(user);
    localStorage.setItem('travel-ai-user', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('travel-ai-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
