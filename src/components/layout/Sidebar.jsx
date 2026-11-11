import { NavLink } from 'react-router-dom';
import { LogOut, Sparkles, X } from 'lucide-react';
import { t } from '../../lib/strings.js';
import { NAV_ITEMS, SECONDARY_NAV } from './navigation.js';
import { Logo } from './Logo.jsx';
import { useAuth } from '../../providers/AuthProvider.jsx';
import { cn } from '../../lib/cn.js';
import { initials } from '../../lib/format.js';

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}
    >
      <Icon size={17} />
      <span className="flex-1 truncate">{item.label}</span>
    </NavLink>
  );
}

export function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[272px] flex-col border-l border-line/60 bg-surface/95 backdrop-blur-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Logo subtitle="إدارة كافيه الألعاب" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-ink lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-[11px] text-muted">
          <Sparkles size={13} className="text-accent" />
          نظام إدارة الكافيه بالكامل
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onClose} />
          ))}

          <div className="my-3 h-px bg-line/70" />

          {SECONDARY_NAV.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onClose} />
          ))}
        </nav>

        <div className="border-t border-line/70 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-surface2/50 px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
              {initials(user?.displayName || user?.username || 'م')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-ink">
                {user?.displayName || user?.username}
              </span>
              <span className="block truncate text-[10.5px] text-muted">
                @{user?.username}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-muted transition hover:bg-danger/10 hover:text-danger"
          >
            <LogOut size={16} />
            {t.common.logout}
          </button>
        </div>
      </aside>
    </>
  );
}
