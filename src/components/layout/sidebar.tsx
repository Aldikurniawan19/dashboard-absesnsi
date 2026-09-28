'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  QrCode,
  Settings,
  Sliders,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface SubNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  children?: SubNavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarContentProps {
  onClose?: () => void;
  isCollapsed?: boolean;
}

function SidebarContent({ onClose, isCollapsed = false }: SidebarContentProps) {
  const pathname = usePathname();
  const { user, isGuru, isAdmin, isWaliKelas } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    '/admin/jadwal': true,
    '/admin/penilaian': true,
  });

  // State menu mengambang (flyout popover) yang aktif saat diklik pada mode collapsed
  const [activeFlyoutMenu, setActiveFlyoutMenu] = useState<string | null>(null);

  // Otomatis buka submenu jika route saat ini berada di dalamnya pada mode expanded
  useEffect(() => {
    if (pathname.startsWith('/admin/jadwal')) {
      setOpenSubmenus((prev) => ({ ...prev, '/admin/jadwal': true }));
    }
    if (pathname.startsWith('/admin/penilaian')) {
      setOpenSubmenus((prev) => ({ ...prev, '/admin/penilaian': true }));
    }
    // Tutup flyout saat berpindah halaman
    setActiveFlyoutMenu(null);
  }, [pathname]);

  // Tutup flyout saat beralih antara mode collapsed/expanded
  useEffect(() => {
    setActiveFlyoutMenu(null);
  }, [isCollapsed]);

  // Handler klik di luar menu mengambang untuk menutup popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sidebar-submenu-item')) {
        setActiveFlyoutMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveFlyoutMenu(null);
      }
    };

    if (activeFlyoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFlyoutMenu]);

  const toggleSubmenu = (key: string) => {
    if (isCollapsed) {
      // Pada mode collapsed, klik memunculkan / menutup floating submenu
      setActiveFlyoutMenu((prev) => (prev === key ? null : key));
    } else {
      // Pada mode expanded, toggle accordion submenu
      setOpenSubmenus((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  // Menu Admin dikelompokkan berdasarkan fungsi
  const adminGroups: NavGroup[] = [
    {
      title: 'Utama',
      items: [
        { href: '/', label: 'Ringkasan Sekolah', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Data Akademik',
      items: [
        { href: '/admin/tahun-ajaran', label: 'Tahun Ajaran', icon: <Clock className="w-4 h-4" /> },
        { href: '/admin/master-data', label: 'Jurusan, Kelas & Mapel', icon: <BookOpen className="w-4 h-4" /> },
        {
          href: '/admin/jadwal',
          label: 'Manajemen Jadwal',
          icon: <Calendar className="w-4 h-4" />,
          children: [
            {
              href: '/admin/jadwal',
              label: 'Jadwal Pelajaran',
              icon: <BookOpen className="w-3.5 h-3.5" />,
            },
            {
              href: '/admin/jadwal/ujian',
              label: 'Jadwal Ujian',
              icon: <GraduationCap className="w-3.5 h-3.5" />,
            },
          ],
        },
        {
          href: '/admin/penilaian',
          label: 'Kurikulum Merdeka',
          icon: <Award className="w-4 h-4" />,
          children: [
            {
              href: '/admin/penilaian/konfigurasi',
              label: 'Bobot & Predikat',
              icon: <Sliders className="w-3.5 h-3.5" />,
            },
            {
              href: '/admin/penilaian/ekstrakurikuler',
              label: 'Master Ekskul',
              icon: <Award className="w-3.5 h-3.5" />,
            },
          ],
        },
      ],
    },
    {
      title: 'Pengguna',
      items: [
        { href: '/admin/pengguna', label: 'Manajemen Pengguna', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Presensi & Laporan',
      items: [
        { href: '/wali-kelas/persetujuan-izin', label: 'Persetujuan Izin Siswa', icon: <FileCheck2 className="w-4 h-4" /> },
        { href: '/laporan/kelas', label: 'Laporan Kehadiran Kelas', icon: <FileSpreadsheet className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Sistem & Pengaturan',
      items: [
        { href: '/admin/sekolah', label: 'Konfigurasi Sekolah', icon: <Settings className="w-4 h-4" /> },
        { href: '/admin/audit-log', label: 'Log Aktivitas Sistem', icon: <History className="w-4 h-4" /> },
      ],
    },
  ];

  // Menu Guru Mapel
  const guruGroups: NavGroup[] = [
    {
      title: 'Utama',
      items: [
        { href: '/', label: 'Ringkasan', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      title: 'KBM & Presensi',
      items: [
        { href: '/guru/jadwal', label: 'Jadwal Mengajar & Sesi', icon: <Calendar className="w-4 h-4" /> },
        { href: '/guru/absensi-manual', label: 'Absensi Manual', icon: <UserCheck className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Penilaian Kurikulum Merdeka',
      items: [
        { href: '/guru/nilai', label: 'Input Nilai Siswa', icon: <Award className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Laporan',
      items: [
        { href: '/laporan/kelas', label: 'Laporan Kehadiran Kelas', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { href: '/laporan/mapel', label: 'Laporan Mata Pelajaran', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
  ];

  // Menu Tambahan Wali Kelas
  const waliKelasGroups: NavGroup[] = [
    {
      title: 'Perwalian Kelas',
      items: [
        { href: '/wali-kelas/persetujuan-izin', label: 'Persetujuan Izin / Sakit', icon: <FileCheck2 className="w-4 h-4" /> },
        { href: '/wali-kelas/rekap-kelas', label: 'Rekap Kehadiran Kelas', icon: <GraduationCap className="w-4 h-4" /> },
        { href: '/wali-kelas/nilai', label: 'Rekap Nilai Kelas', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { href: '/wali-kelas/raport', label: 'Raport Siswa', icon: <FileText className="w-4 h-4" /> },
        { href: '/wali-kelas/ekstrakurikuler', label: 'Ekstrakurikuler Siswa', icon: <Award className="w-4 h-4" /> },
      ],
    },
  ];

  const handleLinkClick = () => {
    setActiveFlyoutMenu(null);
    if (onClose) {
      onClose();
    }
  };

  const renderNavGroup = (group: NavGroup, groupIndex: number) => (
    <div key={group.title} className="mb-3 last:mb-1">
      {/* Jika dalam mode collapsed icon, tampilkan garis pembatas pemisah antar grup */}
      {isCollapsed ? (
        groupIndex > 0 ? (
          <div className="my-2 border-t border-border/60 mx-1" />
        ) : null
      ) : (
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1.5">
          {group.title}
        </p>
      )}

      <nav className="space-y-1">
        {group.items.map((item) => {
          if (item.children && item.children.length > 0) {
            const isParentActive = pathname.startsWith(item.href);
            const isFlyoutOpen = activeFlyoutMenu === item.href;
            const isOpen = openSubmenus[item.href] ?? isParentActive;

            // Render mode collapsed (Icon dengan Sub-Menu Mengambang saat di-klik atau di-hover)
            if (isCollapsed) {
              return (
                <div key={item.label} className="relative group sidebar-submenu-item">
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(item.href)}
                    aria-expanded={isFlyoutOpen}
                    aria-haspopup="true"
                    aria-label={item.label}
                    title={item.label}
                    className={cn(
                      'flex w-full items-center justify-center p-2.5 text-xs font-medium rounded-lg transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary/20',
                      isParentActive || isFlyoutOpen
                        ? 'text-primary font-semibold bg-primary-light/60'
                        : 'text-foreground-muted hover:bg-background hover:text-primary',
                    )}
                  >
                    <span className={cn('shrink-0', isParentActive || isFlyoutOpen ? 'text-primary' : 'text-foreground-muted group-hover:text-primary')}>
                      {item.icon}
                    </span>
                    <span
                      className={cn(
                        'absolute bottom-1 w-1 h-1 rounded-full',
                        isParentActive || isFlyoutOpen ? 'bg-primary' : 'bg-foreground-muted/40',
                      )}
                    />
                  </button>

                  {/* Menu Mengambang (Floating Flyout Menu) saat di-klik atau di-hover */}
                  <div
                    className={cn(
                      'absolute left-full top-0 ml-3 flex-col z-50 min-w-[210px] bg-surface border border-border shadow-elevated rounded-lg p-1.5 pointer-events-auto transition-all',
                      isFlyoutOpen ? 'flex' : 'hidden group-hover:flex',
                    )}
                  >
                    <div className="px-2.5 py-1.5 border-b border-border/60 text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>{item.label}</span>
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {item.children.map((child) => {
                        const isChildActive =
                          child.href === '/admin/jadwal'
                            ? pathname === '/admin/jadwal' || pathname === '/admin/jadwal/buat-otomatis'
                            : pathname.startsWith(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={handleLinkClick}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                              isChildActive
                                ? 'bg-primary text-white font-semibold shadow-subtle'
                                : 'text-foreground-muted hover:text-foreground hover:bg-background',
                            )}
                          >
                            {child.icon && (
                              <span className={cn('shrink-0', isChildActive ? 'text-white' : 'text-foreground-muted')}>
                                {child.icon}
                              </span>
                            )}
                            <span className="truncate">{child.label}</span>
                            {child.badge && (
                              <span
                                className={cn(
                                  'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                  isChildActive ? 'bg-white/20 text-white' : 'bg-primary-light text-primary',
                                )}
                              >
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // Render standar mode expanded
            return (
              <div key={item.label} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSubmenu(item.href)}
                  className={cn(
                    'group flex w-full items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors',
                    isParentActive
                      ? 'text-primary font-semibold bg-primary-light/40'
                      : 'text-foreground hover:bg-background hover:text-primary',
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={cn('shrink-0', isParentActive ? 'text-primary' : 'text-foreground-muted group-hover:text-primary')}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200 text-foreground-muted group-hover:text-primary shrink-0',
                      isOpen ? 'rotate-180 text-primary' : '',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="pl-3 space-y-0.5 pt-0.5 border-l-2 border-border/60 ml-4.5 my-1">
                    {item.children.map((child) => {
                      const isChildActive =
                        child.href === '/admin/jadwal'
                          ? pathname === '/admin/jadwal' || pathname === '/admin/jadwal/buat-otomatis'
                          : pathname.startsWith(child.href);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={handleLinkClick}
                          className={cn(
                            'group flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                            isChildActive
                              ? 'bg-primary text-white font-semibold shadow-subtle'
                              : 'text-foreground-muted hover:text-foreground hover:bg-background',
                          )}
                        >
                          {child.icon && (
                            <span className={cn('shrink-0', isChildActive ? 'text-white' : 'text-foreground-muted group-hover:text-primary')}>
                              {child.icon}
                            </span>
                          )}
                          <span className="truncate">{child.label}</span>
                          {child.badge && (
                            <span
                              className={cn(
                                'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                isChildActive ? 'bg-white/20 text-white' : 'bg-surface border border-border text-foreground-muted',
                              )}
                            >
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          // Render link mode collapsed (Icon dengan Floating Tooltip saat di-hover)
          if (isCollapsed) {
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center justify-center p-2.5 text-xs font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white shadow-subtle'
                      : 'text-foreground-muted hover:bg-background hover:text-primary',
                  )}
                >
                  <span className={cn('shrink-0', isActive ? 'text-white' : 'text-foreground-muted group-hover:text-primary')}>
                    {item.icon}
                  </span>
                </Link>

                {/* Floating Tooltip Mengambang saat di-hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none">
                  <div className="bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-md shadow-elevated whitespace-nowrap flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Render link standar mode expanded
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'group flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-subtle'
                  : 'text-foreground hover:bg-background hover:text-primary',
              )}
            >
              <span className={cn('shrink-0', isActive ? 'text-white' : 'text-foreground-muted group-hover:text-primary')}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded',
                    isActive ? 'bg-white/20 text-white' : 'bg-surface border border-border text-foreground-muted',
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div
        className={cn(
          'flex items-center gap-2.5 border-b border-border/60 shrink-0 h-16',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4 py-3.5',
        )}
      >
        <div className={cn('flex items-center gap-2.5 min-w-0', isCollapsed && 'justify-center')}>
          <div className="relative group">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-subtle shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-md shadow-elevated whitespace-nowrap">
                  {user?.sekolah?.nama || 'Absensi Siswa'}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="truncate">
              <h1 className="text-sm font-bold leading-tight text-foreground truncate">
                Absensi Siswa
              </h1>
              <p className="text-xs text-foreground-muted truncate">
                {user?.sekolah?.nama || 'Portal Akademik'}
              </p>
            </div>
          )}
        </div>

        {/* Tombol Tutup Khusus Mobile Drawer */}
        {!isCollapsed && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-border/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigasi: overflow-visible saat collapsed agar flyout popover tidak terpotong */}
      <div className={cn('flex-1', isCollapsed ? 'p-2 overflow-visible' : 'p-4 overflow-y-auto')}>
        {isAdmin && adminGroups.map((group, index) => renderNavGroup(group, index))}
        {isGuru && guruGroups.map((group, index) => renderNavGroup(group, index))}
        {!isAdmin && isWaliKelas && waliKelasGroups.map((group, index) => renderNavGroup(group, index))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isMobileOpen, isDesktopCollapsed, closeMobileSidebar } = useSidebar();

  return (
    <>
      {/* Desktop Sidebar (Layar >= lg) dengan mode Icon-Only dan Floating Submenu saat diklik/hover */}
      <aside
        id="main-sidebar-desktop"
        aria-label="Navigasi Utama Desktop"
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-surface h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 ease-in-out',
          isDesktopCollapsed ? 'w-16 overflow-visible' : 'w-64',
        )}
      >
        <div className={cn('h-full flex flex-col', isDesktopCollapsed ? 'w-16 overflow-visible' : 'w-64')}>
          <SidebarContent isCollapsed={isDesktopCollapsed} />
        </div>
      </aside>

      {/* Mobile Drawer (Layar < lg) */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-all duration-300',
          isMobileOpen
            ? 'visible opacity-100 pointer-events-auto'
            : 'invisible opacity-0 pointer-events-none',
        )}
        aria-hidden={!isMobileOpen}
      >
        {/* Backdrop Overlay */}
        <div
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity"
          onClick={closeMobileSidebar}
        />

        {/* Off-canvas Drawer Container */}
        <aside
          id="main-sidebar-mobile"
          aria-label="Navigasi Utama Mobile"
          aria-modal="true"
          role="dialog"
          className={cn(
            'relative w-72 max-w-[85vw] h-full bg-surface border-r border-border shadow-elevated flex flex-col transition-transform duration-300 ease-in-out z-50',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarContent onClose={closeMobileSidebar} />
        </aside>
      </div>
    </>
  );
}
