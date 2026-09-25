'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
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

export function Sidebar() {
  const pathname = usePathname();
  const { user, isGuru, isAdmin, isWaliKelas } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    '/admin/jadwal': true,
    '/admin/penilaian': true,
  });

  // Otomatis buka submenu jika route saat ini berada di dalamnya
  useEffect(() => {
    if (pathname.startsWith('/admin/jadwal')) {
      setOpenSubmenus((prev) => ({ ...prev, '/admin/jadwal': true }));
    }
    if (pathname.startsWith('/admin/penilaian')) {
      setOpenSubmenus((prev) => ({ ...prev, '/admin/penilaian': true }));
    }
  }, [pathname]);

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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

  const renderNavGroup = (group: NavGroup) => (
    <div key={group.title} className="mb-4 last:mb-1">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1.5">
        {group.title}
      </p>
      <nav className="space-y-0.5">
        {group.items.map((item) => {
          if (item.children && item.children.length > 0) {
            const isParentActive = pathname.startsWith(item.href);
            const isOpen = openSubmenus[item.href] ?? isParentActive;

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

          return (
            <Link
              key={item.href}
              href={item.href}
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
    <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between h-screen sticky top-0">
      <div className="p-4 overflow-y-auto flex-1">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 py-2 mb-5 border-b border-border/50 pb-4">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-subtle">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-foreground">
              Absensi Siswa
            </h1>
            <p className="text-xs text-foreground-muted truncate w-40">
              {user?.sekolah?.nama || 'Portal Akademik'}
            </p>
          </div>
        </div>

        {/* Render Kelompok Menu Sesuai Peran */}
        {isAdmin && adminGroups.map(renderNavGroup)}

        {isGuru && guruGroups.map(renderNavGroup)}

        {!isAdmin && isWaliKelas && waliKelasGroups.map(renderNavGroup)}
      </div>
    </aside>
  );
}
