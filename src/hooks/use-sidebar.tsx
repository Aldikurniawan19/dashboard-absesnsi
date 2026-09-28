'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
  isMobileOpen: boolean;
  isDesktopCollapsed: boolean;
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleDesktopSidebar: () => void;
  setDesktopCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'sistem_absensi_sidebar_collapsed';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  // Inisialisasi preferensi desktop collapsed dari localStorage saat mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsDesktopCollapsed(stored === 'true');
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  // Tutup mobile drawer otomatis setiap kali berpindah rute/halaman
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Tutup mobile drawer saat tombol Escape ditekan & cegah scroll latar belakang saat drawer aktif
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const setDesktopCollapsed = useCallback((collapsed: boolean) => {
    setIsDesktopCollapsed(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Abaikan error localStorage
    }
  }, []);

  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopCollapsed((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(nextState));
      } catch {
        // Abaikan error localStorage
      }
      return nextState;
    });
  }, []);

  // Toggle fleksibel: mendeteksi apakah di layar mobile atau desktop
  const toggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      toggleDesktopSidebar();
    } else {
      setIsMobileOpen((prev) => !prev);
    }
  }, [toggleDesktopSidebar]);

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        isDesktopCollapsed,
        isOpen: isMobileOpen,
        toggleSidebar,
        closeSidebar: closeMobileSidebar,
        closeMobileSidebar,
        toggleDesktopSidebar,
        setDesktopCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar harus digunakan di dalam SidebarProvider');
  }
  return context;
}
