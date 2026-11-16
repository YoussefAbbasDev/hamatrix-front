import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.js';
import { notificationsApi } from '../api/notifications.js';
import { API_ORIGIN } from '../lib/apiConfig.js';
import { useAuth } from './AuthProvider.jsx';
import { useToast } from './ToastProvider.jsx';

const SocketContext = createContext({
  socket: null,
  connected: false,
  liveUpdates: true,
  pollIntervalMs: 15000,
});

/**
 * Socket.IO needs a long-lived server, which serverless hosts (Vercel) do not
 * provide. Set VITE_ENABLE_SOCKET=false there: the provider then refreshes the
 * active queries on a timer so the UI still converges, just without push.
 */
const SOCKET_ENABLED = String(import.meta.env.VITE_ENABLE_SOCKET ?? 'true') !== 'false';
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS || 15000);

/** How often an open dashboard asks the server to send due push alerts. */
const NOTIFY_TICK_INTERVAL_MS = 60_000;

/** Query key prefixes refreshed by each server event. */
const INVALIDATIONS = {
  'device:status': [['devices'], ['dashboard']],
  'session:started': [['sessions'], ['visits'], ['visit'], ['devices'], ['dashboard']],
  'session:updated': [['sessions'], ['visits'], ['visit'], ['devices'], ['dashboard']],
  'session:paused': [['sessions'], ['visits'], ['visit'], ['devices'], ['dashboard']],
  'session:resumed': [['sessions'], ['visits'], ['visit'], ['devices'], ['dashboard']],
  'session:ended': [['sessions'], ['visits'], ['visit'], ['devices'], ['dashboard']],
  'visit:updated': [['visits'], ['visit'], ['dashboard']],
  'visit:closed': [['visits'], ['visit'], ['dashboard'], ['invoices'], ['reports']],
  'invoice:issued': [
    ['invoices'],
    ['visits'],
    ['visit'],
    ['reports'],
    ['dashboard'],
    ['products'],
    ['inventory'],
  ],
  'invoice:deleted': [
    ['invoices'],
    ['visits'],
    ['visit'],
    ['reports'],
    ['dashboard'],
    ['products'],
    ['inventory'],
  ],
  'expense:created': [['expenses'], ['reports'], ['dashboard']],
};

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    let active = true;
    const invalidate = (keys) => {
      for (const queryKey of keys) queryClient.invalidateQueries({ queryKey });
    };

    // Fallback used when sockets are unavailable: refetch whatever is on screen.
    let pollTimer = null;
    const startPolling = () => {
      if (pollTimer || !Number.isFinite(POLL_INTERVAL_MS) || POLL_INTERVAL_MS <= 0) return;
      pollTimer = setInterval(() => {
        if (active) queryClient.invalidateQueries();
      }, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };

    if (!SOCKET_ENABLED) {
      startPolling();
      return () => {
        active = false;
        stopPolling();
      };
    }

    const socketOptions = {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelayMax: 5000,
      auth: (callback) => {
        authApi
          .socketTicket()
          .then(({ ticket }) => callback({ ticket }))
          .catch(() => callback({}));
      },
    };

    // Same origin unless VITE_API_URL points the SPA at another server.
    const client = API_ORIGIN ? io(API_ORIGIN, socketOptions) : io(socketOptions);

    client.on('connect', () => {
      if (!active) return;
      setConnected(true);
      stopPolling();
      // A reconnect may have missed events: refresh everything once.
      queryClient.invalidateQueries();
    });
    client.on('disconnect', () => {
      if (!active) return;
      setConnected(false);
      startPolling();
    });
    client.on('connect_error', () => {
      if (!active) return;
      setConnected(false);
      // No socket on this host (e.g. serverless): fall back to polling.
      startPolling();
    });

    client.on('settings:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    });

    for (const [event, keys] of Object.entries(INVALIDATIONS)) {
      client.on(event, () => invalidate(keys));
    }

    client.on('stock:low', (payload) => {
      invalidate([['products'], ['inventory'], ['dashboard'], ['reports']]);
      if (payload?.name) {
        toast.info(`المخزون منخفض: ${payload.name} (${payload.stockQty ?? 0})`);
      }
    });

    client.connect();
    setSocket(client);

    return () => {
      active = false;
      stopPolling();
      client.removeAllListeners();
      client.disconnect();
      setSocket(null);
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, queryClient]);

  // Session/stock push alerts are computed on the server. Any logged-in tab
  // nudges it once a minute; the endpoint is idempotent so several tabs and the
  // external scheduler can overlap safely.
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let active = true;
    const tick = () => {
      if (active) notificationsApi.tick().catch(() => null);
    };

    tick();
    const timer = setInterval(tick, NOTIFY_TICK_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({ socket, connected, liveUpdates: SOCKET_ENABLED, pollIntervalMs: POLL_INTERVAL_MS }),
    [socket, connected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
