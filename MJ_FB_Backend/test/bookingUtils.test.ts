import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isDateWithinCurrentOrNextMonth } from '../src/utils/bookingUtils';

describe('isDateWithinCurrentOrNextMonth', () => {
  it('rejects past dates in current month', () => {
    const today = new Date('2023-05-15');
    const pastDate = '2023-05-10';
    assert.equal(isDateWithinCurrentOrNextMonth(pastDate, today), false);
  });

  it('accepts today\'s date', () => {
    const today = new Date('2023-05-15');
    const sameDay = '2023-05-15';
    assert.equal(isDateWithinCurrentOrNextMonth(sameDay, today), true);
  });

  it('allows next month during last week', () => {
    const today = new Date('2023-05-27');
    const nextMonthDate = '2023-06-05';
    assert.equal(isDateWithinCurrentOrNextMonth(nextMonthDate, today), true);
  });

  it('rejects next month when not in last week', () => {
    const today = new Date('2023-05-15');
    const nextMonthDate = '2023-06-05';
    assert.equal(isDateWithinCurrentOrNextMonth(nextMonthDate, today), false);
  });
});
