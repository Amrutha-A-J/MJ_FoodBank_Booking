import { initializeSlots, slots } from '../src/data';

describe('initializeSlots', () => {
  it('populates slots only once', () => {
    initializeSlots();
    const firstRun = slots.slice();
    initializeSlots();
    expect(slots).toHaveLength(10);
    expect(slots).toEqual(firstRun);
  });
});
