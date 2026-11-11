import { cn } from '../../lib/cn.js';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const sizes = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <Component
      className={cn('btn', variants[variant], sizes[size], className)}
      disabled={Component === 'button' ? disabled || loading : undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="opacity-80">جارٍ التنفيذ…</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
}
