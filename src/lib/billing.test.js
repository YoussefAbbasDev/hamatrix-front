import { describe, expect, it } from 'vitest';
import { billableMinutesOf, liveBilling, timeChargeOf } from './billing.js';

const baseSession = {
  status: 'active',
  ratePerHourMinor: 6000,
  activeSeconds: 0,
  targetActiveMinutes: null,
};

describe('billableMinutesOf', () => {
  it('rounds to the nearest minute using the 30-second threshold', () => {
    expect(billableMinutesOf(0)).toBe(0);
    expect(billableMinutesOf(29)).toBe(0);
    expect(billableMinutesOf(30)).toBe(1);
    expect(billableMinutesOf(89)).toBe(1);
    expect(billableMinutesOf(90)).toBe(2);
    expect(billableMinutesOf(3599)).toBe(60);
  });

  it('guards invalid input', () => {
    expect(billableMinutesOf(undefined)).toBe(0);
    expect(billableMinutesOf(-10)).toBe(0);
  });
});

describe('timeChargeOf', () => {
  it('charges pro rata per minute and rounds half up', () => {
    expect(timeChargeOf(6000, 60)).toBe(6000);
    expect(timeChargeOf(6000, 30)).toBe(3000);
    expect(timeChargeOf(3000, 65)).toBe(3250);
    expect(timeChargeOf(1000, 1)).toBe(17);
    expect(timeChargeOf(0, 60)).toBe(0);
  });
});

describe('liveBilling', () => {
  it('extends active time between refreshes for a running session', () => {
    const live = liveBilling(baseSession, {
      fetchedAt: 1_000_000,
      now: 1_000_000 + 125_000,
    });
    expect(live.activeSeconds).toBe(125);
    expect(live.billableMinutes).toBe(2);
    expect(live.timeChargeMinor).toBe(200);
  });

  it('freezes active time for a paused session', () => {
    const live = liveBilling(
      { ...baseSession, status: 'paused', activeSeconds: 120 },
      { fetchedAt: 1_000_000, now: 1_060_000 },
    );
    expect(live.activeSeconds).toBe(120);
    expect(live.billableMinutes).toBe(2);
    expect(live.isOverdue).toBe(false);
  });

  it('reports remaining and overtime for fixed sessions', () => {
    const remaining = liveBilling(
      { ...baseSession, targetActiveMinutes: 30, activeSeconds: 600 },
      { fetchedAt: 0, now: 0 },
    );
    expect(remaining.remainingSeconds).toBe(1200);
    expect(remaining.isOverdue).toBe(false);

    const overtime = liveBilling(
      {
        ...baseSession,
        status: 'paused',
        targetActiveMinutes: 30,
        activeSeconds: 30 * 60 + 90,
      },
      { fetchedAt: 0, now: 1_000 },
    );
    expect(overtime.remainingSeconds).toBe(0);
    expect(overtime.overtimeSeconds).toBe(90);
    expect(overtime.isOverdue).toBe(true);
  });

  it('returns null without a session', () => {
    expect(liveBilling(null)).toBeNull();
  });
});
