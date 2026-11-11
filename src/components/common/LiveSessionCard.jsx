import { Clock3, Gauge, Pause, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money, durationOf, countdownOf } from '../../lib/format.js';
import { liveBilling } from '../../lib/billing.js';
import { useNow } from '../../hooks/useNow.js';
import { SessionStatusBadge } from './StatusBadge.jsx';
import { cn } from '../../lib/cn.js';

export function LiveSessionCard({
  session,
  fetchedAt,
  className,
  showVisit = true,
  actions,
}) {
  const now = useNow();
  const live = liveBilling(session, { fetchedAt, now });
  const paused = session.status === 'paused';
  const visit = session.visit || null;

  return (
    <div
      className={cn(
        'rounded-xl border border-line/70 bg-surface2/40 p-3.5',
        session.isOverdue && 'border-warning/40 bg-warning/5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
            {session.deviceName || 'جهاز'}
            {session.deviceCode && (
              <span className="text-[11px] font-normal text-muted">({session.deviceCode})</span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted">
            <span>{session.billingMode === 'fixed' ? 'مدة محددة' : 'مفتوحة'}</span>
            {session.pricingOptionName && <span>· {session.pricingOptionName}</span>}
            <span>· {money(session.ratePerHourMinor)}/س</span>
          </div>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line/60 bg-surface/60 px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10.5px] text-muted">
            <Clock3 size={11} />
            الوقت
          </p>
          <p
            className={cn(
              'mt-0.5 font-mono text-[15px] font-semibold text-ink',
              paused && 'text-warning',
            )}
          >
            {durationOf(live.activeSeconds)}
          </p>
        </div>
        <div className="rounded-lg border border-line/60 bg-surface/60 px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10.5px] text-muted">
            <Gauge size={11} />
            التكلفة
          </p>
          <p className="mt-0.5 font-mono text-[15px] font-semibold text-accent">
            {money(live.timeChargeMinor)}
          </p>
        </div>
      </div>

      {session.billingMode === 'fixed' && session.targetActiveMinutes != null && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>
              {live.isOverdue
                ? `تجاوز +${countdownOf(live.overtimeSeconds)}`
                : `متبقي ${countdownOf(live.remainingSeconds)}`}
            </span>
            <span className="font-mono">{session.targetActiveMinutes} دقيقة</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/60">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-1000',
                live.isOverdue ? 'bg-warning' : 'bg-accent',
              )}
              style={{
                width: `${Math.min(
                  100,
                  (live.activeSeconds / Math.max(1, session.targetActiveMinutes * 60)) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {showVisit && (visit?.playerName || session.visitId) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11.5px]">
          <span className="flex min-w-0 items-center gap-1.5 text-muted">
            <User size={12} />
            <span className="truncate">{visit?.playerName || 'بدون اسم'}</span>
          </span>
          {session.visitId && (
            <Link
              to={`/visits/${session.visitId}`}
              className="shrink-0 text-accent hover:underline"
            >
              فتح الزيارة
            </Link>
          )}
        </div>
      )}

      {paused && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-warning">
          <Pause size={11} /> الوقت لا يُحتسب أثناء الإيقاف
        </p>
      )}

      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
