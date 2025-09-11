import { ENCOURAGEMENT_MESSAGES, getNextEncouragement } from '../appreciationMessages';

describe('getNextEncouragement', () => {
  it('regenerates order when stored data is malformed', () => {
    localStorage.clear();
    localStorage.setItem('encouragementOrder', 'not json');
    localStorage.setItem('encouragementIndex', '5');

    const msg = getNextEncouragement();

    expect(ENCOURAGEMENT_MESSAGES).toContain(msg);
    const stored = localStorage.getItem('encouragementOrder');
    expect(() => JSON.parse(stored ?? '')).not.toThrow();
    const parsed = JSON.parse(stored ?? '[]');
    expect(new Set(parsed)).toEqual(new Set(ENCOURAGEMENT_MESSAGES));
    expect(localStorage.getItem('encouragementIndex')).toBe('1');
  });
});
