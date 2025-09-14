import { initializeSlots, slots } from '../src/data';

describe('initializeSlots', () => {
  it('does not modify slots on subsequent calls', () => {
    initializeSlots();
    const firstRun = slots.slice();
    const initialLength = slots.length;
    // Second call should hit the early return branch and leave slots untouched
    initializeSlots();
    expect(slots).toHaveLength(initialLength);
    expect(slots).toEqual(firstRun);
  });
});
