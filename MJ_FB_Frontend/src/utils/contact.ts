export function normalizeContactValue(value?: string | null): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.replace(/\s+/g, ' ');
}
