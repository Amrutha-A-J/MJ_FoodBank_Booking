import { formatReginaDate } from '../date';

describe('toDayjs with Date input', () => {
  test('preserves original day', () => {
    const d = new Date('2024-09-02');
    expect(formatReginaDate(d)).toBe('2024-09-02');
  });
});
