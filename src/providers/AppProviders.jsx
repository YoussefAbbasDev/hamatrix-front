import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient.js';
import { ToastProvider } from './ToastProvider.jsx';
import { SettingsProvider } from './SettingsProvider.jsx';
import { AuthProvider } from './AuthProvider.jsx';
import { SocketProvider } from './SocketProvider.jsx';

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SettingsProvider>
          <AuthProvider>
            <SocketProvider>{children}</SocketProvider>
          </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
