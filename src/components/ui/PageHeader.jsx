import { cn } from '../../lib/cn.js';

export function PageHeader({ title, subtitle, action, className }) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line/80 bg-surface/40 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface2 text-muted">
          <Icon size={22} />
        </span>
      )}
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
