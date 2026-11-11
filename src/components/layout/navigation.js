import {
  LayoutDashboard,
  Monitor,
  Timer,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  Wallet,
  History,
  Settings as SettingsIcon,
} from 'lucide-react';
import { t } from '../../lib/strings.js';

export const NAV_ITEMS = [
  { to: '/', label: t.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: '/devices', label: t.nav.devices, icon: Monitor },
  { to: '/visits', label: t.nav.visits, icon: Timer },
  { to: '/pos', label: t.nav.pos, icon: ShoppingCart },
  { to: '/products', label: t.nav.products, icon: Package },
  { to: '/inventory', label: t.nav.inventory, icon: Boxes },
  { to: '/invoices', label: t.nav.invoices, icon: Receipt },
  { to: '/expenses', label: t.nav.expenses, icon: Wallet },
  { to: '/records', label: t.nav.records, icon: History },
];

export const SECONDARY_NAV = [
  { to: '/settings', label: t.nav.settings, icon: SettingsIcon },
];
