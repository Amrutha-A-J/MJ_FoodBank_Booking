import { normalizeContactValue, normalizeContactSearchValue } from '../utils/contact';

describe('normalizeContactValue', () => {
  it('trims string values', () => {
    expect(normalizeContactValue(' 555-1234 ')).toBe('555-1234');
  });

  it('converts numbers to strings', () => {
    expect(normalizeContactValue(3065551234)).toBe('3065551234');
  });

  it('returns empty string for nullish', () => {
    expect(normalizeContactValue(null)).toBe('');
    expect(normalizeContactValue(undefined)).toBe('');
  });

  it('returns empty string for non-string objects', () => {
    expect(normalizeContactValue({})).toBe('');
  });
});

describe('normalizeContactSearchValue', () => {
  it('lowercases normalized value', () => {
    expect(normalizeContactSearchValue(' Foo@Example.com ')).toBe('foo@example.com');
  });

  it('handles non-string gracefully', () => {
    expect(normalizeContactSearchValue(null)).toBe('');
  });
});
