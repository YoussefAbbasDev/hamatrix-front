import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from '../api/settings.js';

const LOCALE = 'ar-EG-u-nu-latn';

/**
 * Server-anchored clock: the offset is taken from the API, then a local
 * one-second tick keeps the display smooth without extra requests.
 */
export function useServerClock() {
  const { data } = useQuery({
    queryKey: ['system', 'time'],
    queryFn: systemApi.time,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const [now, setNow] = useState(() => new Date());
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!data) return;
    setOffset(new Date(data).getTime() - Date.now());
  }, [data]);

  const serverNow = new Date(now.getTime() + offset);

  return {
    now: serverNow,
    time: new Intl.DateTimeFormat(LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Africa/Cairo',
    }).format(serverNow),
    date: new Intl.DateTimeFormat(LOCALE, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Africa/Cairo',
    }).format(serverNow),
  };
}
