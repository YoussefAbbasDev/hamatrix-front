import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api/auth.js';
import { queryClient } from '../lib/queryClient.js';
import { refreshAccessToken, tokenStore } from '../lib/http.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('booting');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    (async () => {
      try {
        const data = await refreshAccessToken();
        if (!mounted.current) return;
        setUser(data.user);
        setStatus('authenticated');
      } catch {
        if (!mounted.current) return;
        tokenStore.clear();
        setStatus('anonymous');
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      tokenStore.clear();
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener('hamatrix:session-expired', onExpired);
    return () => window.removeEventListener('hamatrix:session-expired', onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    tokenStore.set(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The local session is cleared even if the network call fails.
    }
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isBooting: status === 'booting',
      login,
      logout,
      updateUser,
    }),
    [user, status, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
