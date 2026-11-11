import { SESSION_STATUS } from './enums.js';

export const ROUNDING_SECONDS = 30;

export function billableMinutesOf(activeSeconds) {
  if (!Number.isFinite(activeSeconds) || activeSeconds <= 0) return 0;
  return Math.floor((activeSeconds + ROUNDING_SECONDS) / 60);
}

export function timeChargeOf(ratePerHourMinor, minutes) {
  return Math.round((Number(ratePerHourMinor || 0) * Number(minutes || 0)) / 60);
}

/**
 * Client-side mirror of the server billing math, used only to animate the
 * live timer between socket/query refreshes. The server value is authoritative.
 */
export function liveBilling(session, { fetchedAt = Date.now(), now = Date.now() } = {}) {
  if (!session) return null;

  let activeSeconds = Number(session.activeSeconds || 0);
  if (session.status === SESSION_STATUS.ACTIVE) {
    activeSeconds += Math.max(0, Math.floor((now - fetchedAt) / 1000));
  }

  const billableMinutes = billableMinutesOf(activeSeconds);
  const timeChargeMinor = timeChargeOf(session.ratePerHourMinor, billableMinutes);
  const targetSeconds =
    session.targetActiveMinutes != null ? session.targetActiveMinutes * 60 : null;
  const remainingSeconds =
    targetSeconds === null ? null : Math.max(0, targetSeconds - activeSeconds);
  const overtimeSeconds =
    targetSeconds === null ? 0 : Math.max(0, activeSeconds - targetSeconds);

  return {
    activeSeconds,
    billableMinutes,
    timeChargeMinor,
    remainingSeconds,
    overtimeSeconds,
    isOverdue: targetSeconds !== null && activeSeconds >= targetSeconds,
  };
}
