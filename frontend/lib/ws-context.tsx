'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface WSEvent {
  type: string;
  data: unknown;
}

interface WSContextType {
  lastEvent: WSEvent | null;
  connected: boolean;
}

const WSContext = createContext<WSContextType>({ lastEvent: null, connected: false });

export function WSProvider({ children }: { children: React.ReactNode }) {
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = () => {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Ping every 30s to keep alive
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 30000);
      (ws as WebSocket & { _ping?: ReturnType<typeof setInterval> })._ping = ping;
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        setLastEvent(event);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  };

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  return (
    <WSContext.Provider value={{ lastEvent, connected }}>
      {children}
    </WSContext.Provider>
  );
}

export const useWS = () => useContext(WSContext);
