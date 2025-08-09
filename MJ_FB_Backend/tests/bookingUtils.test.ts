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
