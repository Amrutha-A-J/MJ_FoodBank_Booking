import { formatTimeToAmPm } from '../src/utils/dateUtils';

describe('formatTimeToAmPm', () => {
  it('formats midnight correctly', () => {
    expect(formatTimeToAmPm('00:00:00')).toBe('12:00 AM');
  });

  it('formats afternoon times correctly', () => {
    expect(formatTimeToAmPm('13:05:00')).toBe('1:05 PM');
  });
});
