import { normalizeContactValue } from '../utils/contact';

describe('normalizeContactValue', () => {
  it('returns an empty string for nullish input', () => {
    expect(normalizeContactValue(null)).toBe('');
    expect(normalizeContactValue(undefined)).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeContactValue('  306-555-1234  ')).toBe('306-555-1234');
  });

  it('collapses inner whitespace', () => {
    expect(normalizeContactValue('  John   Doe ')).toBe('John Doe');
  });
});
