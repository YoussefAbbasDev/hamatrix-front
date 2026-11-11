import { useEffect, useState } from 'react';
import { Input } from './Input.jsx';
import { minorToInput, parseMoneyInput } from '../../lib/money.js';

/**
 * Text input that keeps the user's typing while emitting integer piastres.
 * Accepts a leading minus when `allowNegative` is set (manual adjustments).
 */
export function MoneyInput({
  value,
  onChange,
  allowNegative = false,
  label,
  error,
  hint,
  placeholder = '0.00',
  ...props
}) {
  const [text, setText] = useState(() => minorToInput(value));

  useEffect(() => {
    const current = parseMoneyInput(text);
    if (current !== value) setText(minorToInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      label={label}
      error={error}
      hint={hint}
      inputMode="decimal"
      dir="ltr"
      className="text-left font-mono"
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        let next = event.target.value;
        if (!allowNegative) next = next.replace(/-/g, '');
        if (!/^-?\d*[.,]?\d{0,2}$/.test(next)) return;
        setText(next);
        const minor = parseMoneyInput(next);
        if (minor !== null) onChange(minor);
        else if (next === '' || next === '-') onChange(0);
      }}
      {...props}
    />
  );
}
