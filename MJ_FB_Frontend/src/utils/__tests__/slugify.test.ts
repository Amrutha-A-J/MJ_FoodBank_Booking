import slugify from '../slugify';

describe('slugify', () => {
  it('creates URL-friendly slugs', () => {
    expect(slugify('Role A')).toBe('role-a');
    expect(slugify('Role B!')).toBe('role-b');
    expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
  });
});
