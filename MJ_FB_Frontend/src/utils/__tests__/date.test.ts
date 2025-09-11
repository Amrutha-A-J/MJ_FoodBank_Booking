import { formatReginaDate, normalizeDate } from '../date';

describe('toDayjs with Date input', () => {
  test('converts from system timezone to Regina', () => {
    const d = new Date('2024-09-02');
    expect(formatReginaDate(d)).toBe('2024-09-01');
  });
});

describe('normalizeDate', () => {
  test('returns YYYY-MM-DD portion of ISO string', () => {
    expect(normalizeDate('2024-05-15T12:34:56Z')).toBe('2024-05-15');
  });

  test('handles undefined input', () => {
    expect(normalizeDate(undefined)).toBe('');
  });
});
