import { describe, expect, it } from 'vitest';
import { minorToInput, parseMoneyInput } from './money.js';

describe('parseMoneyInput', () => {
  it('parses whole and decimal EGP amounts into piastres', () => {
    expect(parseMoneyInput('30')).toBe(3000);
    expect(parseMoneyInput('30.5')).toBe(3050);
    expect(parseMoneyInput('30.55')).toBe(3055);
    expect(parseMoneyInput('0.05')).toBe(5);
  });

  it('accepts Arabic-Indic digits and ignores thousands separators', () => {
    expect(parseMoneyInput('٣٠')).toBe(3000);
    expect(parseMoneyInput('1,250.75')).toBe(125075);
  });

  it('keeps a leading minus only when it parses', () => {
    expect(parseMoneyInput('-2.5')).toBe(-250);
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('-')).toBeNull();
  });
});

describe('minorToInput', () => {
  it('renders piastres for editable inputs', () => {
    expect(minorToInput(3000)).toBe('30');
    expect(minorToInput(3050)).toBe('30.50');
    expect(minorToInput(-500)).toBe('-5');
    expect(minorToInput(null)).toBe('');
  });
});
