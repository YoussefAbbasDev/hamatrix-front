import { Pause, Play, Square, Timer, Plus } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Card.jsx';
import { SessionStatusBadge } from '../common/StatusBadge.jsx';
import { liveBilling } from '../../lib/billing.js';
import { countdownOf, durationOf, money, timeOf } from '../../lib/format.js';
import { useNow } from '../../hooks/useNow.js';
import { cn } from '../../lib/cn.js';

export function SessionRow({
  session,
  fetchedAt,
  busy = false,
  onPause,
  onResume,
  onEnd,
  onExtend,
  onOpenVisit,
}) {
  const now = useNow();
  const live = liveBilling(session, { fetchedAt, now });
  const ended = session.status === 'ended';

  return (
    <div
      className={cn(
        'rounded-xl border border-line/70 bg-surface2/30 p-3.5',
        live.isOverdue && !ended && 'border-warning/40 bg-warning/5',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink">
            <Timer size={15} className="text-muted" />
            {session.deviceName || 'جهاز'}
            {session.deviceCode && (
              <span className="font-mono text-[10.5px] font-normal text-muted">
                {session.deviceCode}
              </span>
            )}
            <SessionStatusBadge status={session.status} />
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>{session.billingMode === 'fixed' ? 'مدة محددة' : 'مفتوحة'}</span>
            {session.pricingOptionName && <span>· {session.pricingOptionName}</span>}
            <span>· {money(session.ratePerHourMinor)}/س</span>
            <span>· بدأت {timeOf(session.startedAt)}</span>
            {ended && session.endedAt && <span>· انتهت {timeOf(session.endedAt)}</span>}
          </p>
        </div>

        <div className="text-left">
          <p
            className={cn(
              'font-mono text-[17px] font-semibold',
              ended ? 'text-muted' : session.status === 'paused' ? 'text-warning' : 'text-ink',
            )}
          >
            {durationOf(live.activeSeconds)}
          </p>
          <p className="font-mono text-[12px] font-semibold text-accent">
            {money(live.timeChargeMinor)}
          </p>
          <p className="text-[10px] text-muted">{live.billableMinutes} دقيقة محسوبة</p>
        </div>
      </div>

      {!ended && session.billingMode === 'fixed' && session.targetActiveMinutes != null && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className={live.isOverdue ? 'text-warning' : 'text-muted'}>
              {live.isOverdue
                ? `تجاوز ${countdownOf(live.overtimeSeconds)} — يُحسب بنفس السعر`
                : `متبقي ${countdownOf(live.remainingSeconds)}`}
            </span>
            <span className="font-mono text-muted">{session.targetActiveMinutes} دقيقة</span>
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

      {!ended && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {session.status === 'active' ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onPause(session)}
            >
              <Pause size={14} />
              إيقاف مؤقت
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onResume(session)}
            >
              <Play size={14} />
              استئناف
            </Button>
          )}

          {session.billingMode === 'fixed' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onExtend(session, 15)}
              >
                <Plus size={14} />
                15 د
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onExtend(session, 30)}
              >
                <Plus size={14} />
                30 د
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="danger"
            className="mr-auto"
            disabled={busy}
            onClick={() => onEnd(session)}
          >
            <Square size={13} />
            إنهاء اللعب
          </Button>
        </div>
      )}

      {ended && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <Badge tone="neutral">
            {session.endReason === 'checkout'
              ? 'أُنهيت عند التحصيل'
              : session.endReason === 'fixed_time'
                ? 'انتهى الوقت المحدد'
                : 'انتهت الجلسة'}
          </Badge>
          {onOpenVisit && (
            <button
              type="button"
              onClick={() => onOpenVisit(session)}
              className="text-[11.5px] text-accent hover:underline"
            >
              الزيارة
            </button>
          )}
        </div>
      )}
    </div>
  );
}
