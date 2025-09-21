import { describe, expect, it } from '@jest/globals';
import { normalizeEmail } from '../../src/utils/normalizeEmail';

describe('utils/normalizeEmail', () => {
  it('trims surrounding whitespace and lowercases email addresses', () => {
    expect(normalizeEmail('  Foo.Bar@Example.COM  ')).toBe('foo.bar@example.com');
    expect(normalizeEmail('\nMixEd@Domain.Ca\t')).toBe('mixed@domain.ca');
  });

  it('returns undefined for empty or whitespace-only strings', () => {
    expect(normalizeEmail('')).toBeUndefined();
    expect(normalizeEmail('    ')).toBeUndefined();
  });

  it('returns undefined for non-string values', () => {
    expect(normalizeEmail(42)).toBeUndefined();
    expect(normalizeEmail({ email: 'user@example.com' })).toBeUndefined();
    expect(normalizeEmail(null)).toBeUndefined();
  });
});
