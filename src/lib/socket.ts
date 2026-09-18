import { io, Socket } from 'socket.io-client';

const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSesiSocket(): Socket {
  if (!socket) {
    socket = io(`${socketURL}/sesi`, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
