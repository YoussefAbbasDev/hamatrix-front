import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button.jsx';
import { cn } from '../../lib/cn.js';

export function LoadingRows({ rows = 3, className }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-14 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ message = 'تعذر تحميل البيانات', onRetry, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-4',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-[13px] leading-relaxed text-danger">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          <RefreshCw size={14} />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function InlineEmpty({ icon: Icon = Inbox, title, description, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line/70 bg-surface/30 px-5 py-9 text-center',
        className,
      )}
    >
      <Icon size={22} className="text-muted/70" />
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description && <p className="max-w-xs text-[12px] leading-relaxed text-muted">{description}</p>}
    </div>
  );
}
