export function hexToRgbTriplet(hex, fallback = '255 46 147') {
  if (typeof hex !== 'string') return fallback;
  const value = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
  const int = Number.parseInt(value, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}
