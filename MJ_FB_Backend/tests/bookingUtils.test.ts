import { describe, it, expect, afterAll } from '@jest/globals';

const originalTZ = process.env.TZ;

function loadUtils() {
  // Reload the module after timezone change
  jest.resetModules();
  return require('../src/utils/bookingUtils');
}

describe('getMonthRange across time zones', () => {
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('returns correct range in UTC', () => {
    process.env.TZ = 'UTC';
    const { getMonthRange } = loadUtils();
    const date = new Date('2024-03-31T00:00:00Z');
    expect(getMonthRange(date)).toEqual({ start: '2024-03-01', end: '2024-03-31' });
  });

  it('returns correct range in Pacific/Auckland', () => {
    process.env.TZ = 'Pacific/Auckland';
    const { getMonthRange } = loadUtils();
    const date = new Date('2024-03-31T00:00:00Z');
    expect(getMonthRange(date)).toEqual({ start: '2024-03-01', end: '2024-03-31' });
  });

  it('handles leap year February correctly', () => {
    process.env.TZ = 'Pacific/Auckland';
    const { getMonthRange } = loadUtils();
    const date = new Date('2024-02-15T00:00:00Z');
    expect(getMonthRange(date)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });
});

describe('isDateWithinCurrentOrNextMonth', () => {
  it('returns false for invalid date', () => {
    const { isDateWithinCurrentOrNextMonth } = require('../src/utils/bookingUtils');
    expect(isDateWithinCurrentOrNextMonth('not-a-date')).toBe(false);
  });
});

describe('combineSlots and splitSlots', () => {
  it('splits range then combines back', () => {
    const { splitSlots, combineSlots } = require('../src/utils/bookingUtils');
    const parts = splitSlots('09:00', '10:30', 30);
    expect(parts).toEqual([
      { startTime: '09:00', endTime: '09:30' },
      { startTime: '09:30', endTime: '10:00' },
      { startTime: '10:00', endTime: '10:30' },
    ]);
    expect(combineSlots(parts)).toEqual([
      { startTime: '09:00', endTime: '10:30' },
    ]);
  });

  it('throws on invalid inputs', () => {
    const { splitSlots, combineSlots } = require('../src/utils/bookingUtils');
    expect(() => splitSlots('10:00', '09:00', 30)).toThrow('Invalid time range');
    expect(() => splitSlots('09:00', '10:15', 30)).toThrow('Range not divisible by interval');
    expect(() => combineSlots([{ startTime: '09:30', endTime: '09:00' }])).toThrow(
      'Invalid slot',
    );
  });
});

describe('getSlotDates across daylight saving changes', () => {
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('handles DST start correctly', () => {
    process.env.TZ = 'America/New_York';
    const { getSlotDates } = loadUtils();
    expect(getSlotDates('2024-03-09', '2024-03-11')).toEqual([
      '2024-03-09',
      '2024-03-10',
      '2024-03-11',
    ]);
  });

  it('handles DST end correctly', () => {
    process.env.TZ = 'America/New_York';
    const { getSlotDates } = loadUtils();
    expect(getSlotDates('2024-11-02', '2024-11-04')).toEqual([
      '2024-11-02',
      '2024-11-03',
      '2024-11-04',
    ]);
  });

  it('throws on invalid parameters', () => {
    const { getSlotDates } = require('../src/utils/bookingUtils');
    expect(() => getSlotDates('bad', '2024-03-10')).toThrow('Invalid date range');
    expect(() => getSlotDates('2024-03-10', '2024-03-09')).toThrow('Invalid date range');
  });
});
