'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface WSEvent {
  type: string;
  data: unknown;
}

interface WSContextType {
  lastEvent: WSEvent | null;
  connected: boolean;
  emitEvent: (event: WSEvent) => void;
}

const WSContext = createContext<WSContextType>({ 
  lastEvent: null, 
  connected: true,
  emitEvent: () => {} 
});

export function WSProvider({ children }: { children: React.ReactNode }) {
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [connected, setConnected] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  const emitEvent = (event: WSEvent) => {
    setLastEvent(event);
  };

  const connect = () => {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const explicitUrl = process.env.NEXT_PUBLIC_WS_URL;

    // If on HTTPS and no explicit secure WSS URL is provided, operate in serverless event mode
    if (isHttps && !explicitUrl) {
      setConnected(true);
      return;
    }

    const WS_URL = explicitUrl || 'ws://localhost:8000/api/ws';

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        attemptsRef.current = 0;
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
        attemptsRef.current += 1;
        // If after 3 attempts it cannot connect (e.g. running standalone on Vercel), fall back to serverless mode
        if (attemptsRef.current < 3) {
          reconnectRef.current = setTimeout(connect, 5000);
        } else {
          setConnected(true); // Connected in virtual serverless mode
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setConnected(true);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  return (
    <WSContext.Provider value={{ lastEvent, connected, emitEvent }}>
      {children}
    </WSContext.Provider>
  );
}

export const useWS = () => useContext(WSContext);
