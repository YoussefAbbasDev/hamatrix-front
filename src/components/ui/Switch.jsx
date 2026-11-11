import { cn } from '../../lib/cn.js';

export function Switch({ checked, onChange, label, description, disabled, className }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line/70 bg-surface2/40 px-3.5 py-3 transition hover:border-line',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] text-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={Boolean(checked)}
          onChange={(event) => onChange?.(event.target.checked)}
          disabled={disabled}
        />
        <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="pointer-events-none absolute right-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:-translate-x-5" />
      </span>
    </label>
  );
}

export function Spinner({ className, size = 20 }) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-muted/30 border-t-accent',
        className,
      )}
      style={{ width: size, height: size }}
      role="status"
      aria-label="جارٍ التحميل"
    />
  );
}

export function FullPageLoader({ label = 'جارٍ التحميل…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner size={26} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
