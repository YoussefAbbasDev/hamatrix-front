const LOCALE = 'ar-EG-u-nu-latn';

const egp = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats integer piastres as Egyptian pounds. */
export function money(minor = 0, { symbol = true } = {}) {
  const value = egp.format(Number(minor || 0) / 100);
  return symbol ? `${value} ج.م` : value;
}

export function number(value = 0) {
  return new Intl.NumberFormat(LOCALE).format(Number(value) || 0);
}

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Africa/Cairo',
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Cairo',
});

export const timeOf = (value) => timeFormatter.format(value ? new Date(value) : new Date());
export const dateOf = (value) => dateFormatter.format(value ? new Date(value) : new Date());

/** Elapsed time from a start date, formatted as H:MM:SS. */
export function elapsed(startedAt, endedAt = null) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const total = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Africa/Cairo',
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Cairo',
});

export const dateTimeOf = (value) =>
  dateTimeFormatter.format(value ? new Date(value) : new Date());
export const shortDateOf = (value) =>
  shortDateFormatter.format(value ? new Date(value) : new Date());

/** H:MM:SS from a number of seconds. */
export function durationOf(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/** Countdown label: MM:SS when under an hour, H:MM:SS otherwise. */
export function countdownOf(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/** YYYY-MM-DD in Cairo, suitable for date inputs and API filters. */
export function dayOf(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Cairo',
  }).format(value instanceof Date ? value : new Date(value));
}

/** Plain decimal amount without symbol, for copyable text. */
export function moneyValue(minor = 0) {
  return egp.format(Number(minor || 0) / 100);
}

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
