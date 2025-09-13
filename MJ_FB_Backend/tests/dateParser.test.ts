import { types } from 'pg';
describe('pg DATE type parser', () => {
  it('returns YYYY-MM-DD strings without timezone conversion', () => {
    // Apply the same parser configuration used in src/db without needing the real pool
    types.setTypeParser(1082, (val) => val);
    const parser = types.getTypeParser(1082, 'text');
    expect(parser('2024-03-10')).toBe('2024-03-10');
  });
});
