import { formatReginaDate, reginaStartOfDayISO } from '../src/utils/dateUtils';

describe('formatReginaDate', () => {
  it('interprets YYYY-MM-DD strings in Regina timezone', () => {
    expect(formatReginaDate('2024-08-26')).toBe('2024-08-26');
  });
});

describe('reginaStartOfDayISO', () => {
  it('returns midnight in Regina for given date string', () => {
    expect(reginaStartOfDayISO('2024-08-26')).toBe('2024-08-26T00:00:00-06:00');
  });
});
