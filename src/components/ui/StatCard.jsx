import { cn } from '../../lib/cn.js';

const tones = {
  accent: 'text-accent bg-accent/10 border-accent/25',
  success: 'text-success bg-success/10 border-success/25',
  warning: 'text-warning bg-warning/10 border-warning/25',
  danger: 'text-danger bg-danger/10 border-danger/25',
  cyan: 'text-cyan bg-cyan/10 border-cyan/25',
  neutral: 'text-muted bg-surface2/70 border-line/80',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'neutral', className }) {
  return (
    <div className={cn('stat', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="stat-label">{label}</p>
          <p className="stat-value truncate">{value}</p>
        </div>
        {Icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
              tones[tone],
            )}
          >
            <Icon size={17} />
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
