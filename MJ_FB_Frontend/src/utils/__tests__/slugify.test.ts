import slugify from '../slugify';

describe('slugify', () => {
  it('converts strings to slugs', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });
});
