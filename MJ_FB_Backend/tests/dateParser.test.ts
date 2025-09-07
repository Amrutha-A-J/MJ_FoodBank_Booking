import { types } from 'pg';
import '../src/db';

describe('pg DATE type parser', () => {
  it('returns YYYY-MM-DD strings without timezone conversion', () => {
    const parser = types.getTypeParser(1082, 'text');
    expect(parser('2024-03-10')).toBe('2024-03-10');
  });
});
