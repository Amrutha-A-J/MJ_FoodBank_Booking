import { formatReginaDate, formatReginaDateTime, reginaStartOfDay } from '../utils/date';

describe('date utils', () => {
  const sample = '2024-01-15T12:34:56Z';

  test('formatReginaDate', () => {
    expect(formatReginaDate(sample)).toBe('2024-01-15');
  });

  test('formatReginaDateTime', () => {
    expect(formatReginaDateTime(sample)).toBe('2024-01-15 06:34:56');
  });

  test('reginaStartOfDay', () => {
    const start = reginaStartOfDay(sample);
    expect(start.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 00:00:00');
  });
});
