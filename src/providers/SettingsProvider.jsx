import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings.js';
import { hexToRgbTriplet } from '../lib/color.js';

const SettingsContext = createContext(null);

const DEFAULTS = {
  brand: {
    name: 'HAMATRIX',
    logoUrl: '/logo.png',
    accentColor: '#FF2E93',
    accentColor2: '#8B5CFF',
  },
  locale: { currency: 'EGP', timezone: 'Africa/Cairo' },
  ui: { theme: 'dark', reduceEffects: false },
};

export function SettingsProvider({ children }) {
  const query = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: settingsApi.public,
    staleTime: 5 * 60_000,
  });

  const settings = query.data || DEFAULTS;

  useEffect(() => {
    const root = document.documentElement;
    const accent = hexToRgbTriplet(settings.brand?.accentColor, '255 46 147');
    const accent2 = hexToRgbTriplet(settings.brand?.accentColor2, '139 92 255');

    root.style.setProperty('--accent-rgb', accent);
    root.style.setProperty('--accent-2-rgb', accent2);
    root.dataset.theme = settings.ui?.theme === 'light' ? 'light' : 'dark';
    root.dataset.reduceEffects = String(Boolean(settings.ui?.reduceEffects));

    const themeColor = settings.ui?.theme === 'light' ? '#F6F5FB' : '#090810';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeColor);

    document.title = `${settings.brand?.name || 'HAMATRIX'} — إدارة كافيه الألعاب`;
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      isLoading: query.isLoading,
      refetch: query.refetch,
    }),
    [settings, query.isLoading, query.refetch],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
