'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { UserProfile, UserRole } from '@/types/api';
import { toast } from '@/components/ui/toast';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isGuru: boolean;
  isWaliKelas: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await api.get('/auth/me');
      if (res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      }
    } catch {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore JSON parse error
    }
    fetchProfile();
  }, []);

  const login = async (identifier: string, password: string) => {
    const deviceInfo = typeof navigator !== 'undefined' ? `${navigator.userAgent}` : 'Web Browser';

    const res = await api.post('/auth/login', {
      identifier,
      password,
      device_info: deviceInfo,
    });

    const { user: loggedInUser, tokens } = res.data.data;

    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));

    queryClient.clear();
    setUser(loggedInUser);
    toast.success('Berhasil masuk', `Selamat datang, ${loggedInUser.nama}`);
    router.push('/');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore error on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      queryClient.clear();
      setUser(null);
      toast.info('Berhasil keluar');
      router.push('/login');
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isGuru = user?.role === 'GURU';
  const isWaliKelas =
    isGuru &&
    Array.isArray(user?.penugasan_wali_kelas) &&
    user.penugasan_wali_kelas.length > 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isGuru,
        isWaliKelas,
        login,
        logout,
        refetchProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
