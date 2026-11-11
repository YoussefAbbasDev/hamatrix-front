import { Badge } from '../ui/Card.jsx';

const DEVICE = {
  available: { label: 'متاح', tone: 'success' },
  occupied: { label: 'مشغول', tone: 'danger' },
  maintenance: { label: 'صيانة', tone: 'neutral' },
};

const SESSION = {
  active: { label: 'شغّالة', tone: 'success' },
  paused: { label: 'موقوفة', tone: 'warning' },
  ended: { label: 'منتهية', tone: 'neutral' },
};

export function DeviceStatusBadge({ status }) {
  const meta = DEVICE[status] || DEVICE.maintenance;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function SessionStatusBadge({ status }) {
  const meta = SESSION[status] || SESSION.ended;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function VisitStatusBadge({ status }) {
  return status === 'open' ? (
    <Badge tone="accent">مفتوحة</Badge>
  ) : (
    <Badge tone="neutral">مغلقة</Badge>
  );
}

export function InvoiceTypeBadge({ type }) {
  return type === 'quick_sale' ? (
    <Badge tone="warning">بيع سريع</Badge>
  ) : (
    <Badge tone="accent">جلسة</Badge>
  );
}

export function MovementTypeBadge({ type }) {
  const map = {
    purchase: { label: 'توريد', tone: 'success' },
    initial: { label: 'افتتاحي', tone: 'neutral' },
    sale: { label: 'بيع', tone: 'accent' },
    adjustment: { label: 'تسوية', tone: 'warning' },
    damage: { label: 'تالف', tone: 'danger' },
    waste: { label: 'هالك', tone: 'danger' },
  };
  const meta = map[type] || { label: type, tone: 'neutral' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
