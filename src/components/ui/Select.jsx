import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn.js';

export const Select = forwardRef(function Select(
  { label, error, hint, options = [], children, className, containerClassName, id, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="field-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn('field appearance-none pl-9', error && 'field-error', className)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        {...props}
      >
        {children ||
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
      {error ? (
        <p id={`${selectId}-error`} className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${selectId}-hint`} className="mt-1.5 text-[12px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, containerClassName, id, rows = 3, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="field-label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={cn('field resize-y', error && 'field-error', className)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-[12px] text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
      )}
    </div>
  );
});
