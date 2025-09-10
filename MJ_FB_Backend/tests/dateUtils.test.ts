import { getWeekForDate } from '../src/utils/dateUtils';

describe('getWeekForDate', () => {
  it('returns week-of-month with Monday start', () => {
    expect(getWeekForDate('2024-05-20')).toEqual({
      year: 2024,
      month: 5,
      week: 4,
      startDate: '2024-05-20',
      endDate: '2024-05-26',
    });
  });

  it('handles months starting on Sunday', () => {
    expect(getWeekForDate('2024-09-09')).toEqual({
      year: 2024,
      month: 9,
      week: 3,
      startDate: '2024-09-09',
      endDate: '2024-09-15',
    });
  });
});
