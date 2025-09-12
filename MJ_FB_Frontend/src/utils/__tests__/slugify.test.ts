import slugify from '../slugify';

describe('slugify', () => {
  it('converts strings to slugs', () => {
    expect(slugify('Role A')).toBe('role-a');
    expect(slugify('Role  B')).toBe('role-b');
    expect(slugify('Role! Name?')).toBe('role-name');
  });
});
