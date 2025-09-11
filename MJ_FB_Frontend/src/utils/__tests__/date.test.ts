import { formatReginaDate, startOfWeek, getWeekDates } from '../date';

describe('toDayjs with Date input', () => {
  test('converts from system timezone to Regina', () => {
    const d = new Date('2024-09-02');
    expect(formatReginaDate(d)).toBe('2024-09-01');
  });
});

describe('startOfWeek', () => {
  test('returns Monday of the same week', () => {
    const d = new Date('2024-05-16'); // Thursday
    expect(formatReginaDate(startOfWeek(d))).toBe('2024-05-13');
  });
});

describe('getWeekDates', () => {
  test('returns seven dates starting from Monday', () => {
    const dates = getWeekDates(new Date('2024-05-16'));
    expect(dates).toHaveLength(7);
    expect(formatReginaDate(dates[0])).toBe('2024-05-13');
    expect(formatReginaDate(dates[6])).toBe('2024-05-19');
  });
});
