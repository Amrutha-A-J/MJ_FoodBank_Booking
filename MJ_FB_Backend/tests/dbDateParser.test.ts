import { types } from 'pg';
import '../src/db';

describe('pg date parser', () => {
  it('returns DATE fields as raw YYYY-MM-DD strings', () => {
    const parser = types.getTypeParser(1082);
    expect(parser('2024-05-06')).toBe('2024-05-06');
  });
});

