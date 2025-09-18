export function normalizeContactValue(value: unknown): string {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function normalizeContactSearchValue(value: unknown): string {
  return normalizeContactValue(value).toLowerCase();
}
