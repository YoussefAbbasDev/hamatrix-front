import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn.js';

export const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, className, containerClassName, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn('field', Icon && 'pr-10', error && 'field-error', className)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-[12px] text-muted/80">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function Textarea({ label, error, hint, className, containerClassName, id, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={2}
        className={cn('field resize-y', error && 'field-error', className)}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-muted/80">{hint}</p>
      ) : null}
    </div>
  );
}
