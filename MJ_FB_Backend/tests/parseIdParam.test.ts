import { parseIdParam } from '../src/utils/parseIdParam';

describe('parseIdParam', () => {
  it('returns number for positive integer strings and numbers', () => {
    expect(parseIdParam('5')).toBe(5);
    expect(parseIdParam(10)).toBe(10);
  });

  it('returns null for invalid strings', () => {
    expect(parseIdParam('abc')).toBeNull();
    expect(parseIdParam('1.5')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseIdParam('0')).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(parseIdParam(-3)).toBeNull();
    expect(parseIdParam('-7')).toBeNull();
  });

  it('returns null for null or undefined', () => {
    expect(parseIdParam(null as any)).toBeNull();
    expect(parseIdParam(undefined)).toBeNull();
  });
});

