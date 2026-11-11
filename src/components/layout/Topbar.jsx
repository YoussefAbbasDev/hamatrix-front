import { Menu, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { NAV_ITEMS, SECONDARY_NAV } from './navigation.js';
import { useServerClock } from '../../hooks/useServerClock.js';
import { useSocket } from '../../providers/SocketProvider.jsx';
import { useAuth } from '../../providers/AuthProvider.jsx';
import { cn } from '../../lib/cn.js';

const TITLES = [...NAV_ITEMS, ...SECONDARY_NAV];

export function Topbar({ onOpenNav }) {
  const { pathname } = useLocation();
  const { time, date } = useServerClock();
  const { connected, liveUpdates, pollIntervalMs } = useSocket();
  const { user } = useAuth();

  const current =
    TITLES.find((item) => item.to === pathname) ||
    TITLES.filter((item) => item.to !== '/' && pathname.startsWith(`${item.to}/`)).sort(
      (a, b) => b.to.length - a.to.length,
    )[0] ||
    (pathname.startsWith('/settings') ? SECONDARY_NAV[0] : null);

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <div className="flex min-h-[62px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          className="rounded-lg p-2 text-muted transition hover:bg-surface2 hover:text-ink lg:hidden"
          aria-label="فتح القائمة"
        >
          <Menu size={19} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-ink">
            {current?.label || 'HAMATRIX'}
          </p>
          <p className="hidden truncate text-[11px] text-muted sm:block">{date}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'chip hidden sm:inline-flex',
              !liveUpdates
                ? 'border-line/70 text-muted'
                : connected
                  ? 'border-success/30 text-success'
                  : 'border-danger/30 text-danger',
            )}
            title={
              !liveUpdates
                ? `تحديث تلقائي كل ${Math.round(pollIntervalMs / 1000)} ثانية`
                : connected
                  ? 'التحديث المباشر يعمل'
                  : 'التحديث المباشر متوقف'
            }
          >
            {!liveUpdates ? (
              <RefreshCw size={12} />
            ) : connected ? (
              <Wifi size={12} />
            ) : (
              <WifiOff size={12} />
            )}
            {!liveUpdates ? 'تحديث تلقائي' : connected ? 'مباشر' : 'غير متصل'}
          </span>

          <span className="chip font-mono text-[12px] text-ink" dir="ltr" title="توقيت الخادم">
            {time}
          </span>

          <span className="hidden rounded-full border border-line/70 bg-surface2/60 px-3 py-1 text-[11.5px] text-muted md:inline-flex">
            {user?.displayName || user?.username}
          </span>
        </div>
      </div>
    </header>
  );
}
