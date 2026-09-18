'use client';

import { useEffect, useState } from 'react';
import { getSesiSocket } from '@/lib/socket';
import { Absensi } from '@/types/api';

interface UseSesiSocketOptions {
  sesiId: string;
  onScanMasuk?: (absen: Absensi) => void;
  onSesiSelesai?: (data: any) => void;
}

export function useSesiSocket({
  sesiId,
  onScanMasuk,
  onSesiSelesai,
}: UseSesiSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [liveAttendees, setLiveAttendees] = useState<Absensi[]>([]);

  useEffect(() => {
    if (!sesiId) return;

    const socket = getSesiSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('join_sesi', { sesi_id: sesiId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleScanEvent = (payload: Absensi) => {
      setLiveAttendees((prev) => [payload, ...prev]);
      if (onScanMasuk) {
        onScanMasuk(payload);
      }
    };

    const handleSelesaiEvent = (payload: any) => {
      if (onSesiSelesai) {
        onSesiSelesai(payload);
      }
    };

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('join_sesi', { sesi_id: sesiId });
    } else {
      socket.connect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('scan_masuk', handleScanEvent);
    socket.on('sesi_selesai', handleSelesaiEvent);

    return () => {
      socket.emit('leave_sesi', { sesi_id: sesiId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('scan_masuk', handleScanEvent);
      socket.off('sesi_selesai', handleSelesaiEvent);
    };
  }, [sesiId, onScanMasuk, onSesiSelesai]);

  return {
    isConnected,
    liveAttendees,
  };
}
