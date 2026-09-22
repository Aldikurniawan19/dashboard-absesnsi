'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Calendar,
  Clock,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings,
  UserCheck,
  Users,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isGuru, isAdmin, isWaliKelas, logout } = useAuth();

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
        { href: '/admin/jadwal', label: 'Jadwal & Deteksi Bentrok', icon: <Calendar className="w-4 h-4" /> },
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
      ],
    },
  ];

  const renderNavGroup = (group: NavGroup) => (
    <div key={group.title} className="mb-4 last:mb-1">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1.5">
        {group.title}
      </p>
      <nav className="space-y-0.5">
        {group.items.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'group flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-subtle'
                  : 'text-foreground hover:bg-background hover:text-primary',
              )}
            >
              <span className={cn('shrink-0', isActive ? 'text-white' : 'text-foreground-muted group-hover:text-primary')}>
                {link.icon}
              </span>
              <span className="truncate">{link.label}</span>
              {link.badge && (
                <span
                  className={cn(
                    'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded',
                    isActive ? 'bg-white/20 text-white' : 'bg-surface border border-border text-foreground-muted',
                  )}
                >
                  {link.badge}
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

      {/* User Footer */}
      <div className="p-4 border-t border-border/50 bg-background/50">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary-light border border-primary/30 flex items-center justify-center text-primary font-semibold text-xs">
              {user?.nama?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-foreground truncate w-32">
                {user?.nama || 'Pengguna'}
              </p>
              <p className="text-xs text-foreground-muted capitalize">
                {user?.role === 'ADMIN' ? 'Administrator' : isWaliKelas ? 'Guru (Wali Kelas)' : 'Guru Mata Pelajaran'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-light transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Keluar dari Akun</span>
        </button>
      </div>
    </aside>
  );
}
