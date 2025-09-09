import { getWeekRanges, getWeekForDate } from '../pantryWeek';

describe('getWeekRanges', () => {
  test('splits May 2024 into weeks', () => {
    expect(getWeekRanges(2024, 4)).toEqual([
      { week: 1, startDate: '2024-05-01', endDate: '2024-05-05' },
      { week: 2, startDate: '2024-05-06', endDate: '2024-05-12' },
      { week: 3, startDate: '2024-05-13', endDate: '2024-05-19' },
      { week: 4, startDate: '2024-05-20', endDate: '2024-05-26' },
      { week: 5, startDate: '2024-05-27', endDate: '2024-05-31' },
    ]);
  });

  test('handles month starting on Sunday', () => {
    expect(getWeekRanges(2024, 8)).toEqual([
      { week: 1, startDate: '2024-09-01', endDate: '2024-09-01' },
      { week: 2, startDate: '2024-09-02', endDate: '2024-09-08' },
      { week: 3, startDate: '2024-09-09', endDate: '2024-09-15' },
      { week: 4, startDate: '2024-09-16', endDate: '2024-09-22' },
      { week: 5, startDate: '2024-09-23', endDate: '2024-09-29' },
      { week: 6, startDate: '2024-09-30', endDate: '2024-09-30' },
    ]);
  });
});

describe('getWeekForDate', () => {
  test('returns week info for a given date', () => {
    expect(getWeekForDate('2024-05-06')).toEqual({
      year: 2024,
      month: 4,
      week: 2,
      startDate: '2024-05-06',
      endDate: '2024-05-12',
    });
  });
});
