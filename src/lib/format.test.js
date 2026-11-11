import { describe, expect, it } from 'vitest';
import { elapsed, money, number } from './format.js';

describe('money', () => {
  it('formats piastres as EGP with two decimals', () => {
    expect(money(3000)).toContain('30.00');
    expect(money(3000)).toContain('ج.م');
    expect(money(0, { symbol: false })).toContain('0.00');
  });

  it('handles missing values', () => {
    expect(money(undefined, { symbol: false })).toContain('0.00');
    expect(money(null, { symbol: false })).toContain('0.00');
  });
});

describe('elapsed', () => {
  it('formats hours, minutes and seconds', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    const end = new Date('2026-01-01T11:23:17Z');
    expect(elapsed(start, end)).toBe('1:23:17');
  });

  it('never goes negative', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    const end = new Date('2026-01-01T09:00:00Z');
    expect(elapsed(start, end)).toBe('0:00:00');
  });
});

describe('number', () => {
  it('formats numbers in Arabic locale', () => {
    expect(number(1200)).toBeTruthy();
    expect(number(undefined)).toBeTruthy();
  });
});
