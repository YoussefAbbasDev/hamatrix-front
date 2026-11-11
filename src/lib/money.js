/** Parses an EGP amount typed by the user into integer piastres. */
export function parseMoneyInput(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^\d.-]/g, '')
    .trim();

  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

/** Formats integer piastres for an editable money input (no currency symbol). */
export function minorToInput(minor) {
  if (minor === null || minor === undefined || minor === '') return '';
  const value = Number(minor) / 100;
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
