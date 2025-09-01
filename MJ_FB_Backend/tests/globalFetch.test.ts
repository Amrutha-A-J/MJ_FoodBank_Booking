import { describe, it, expect } from '@jest/globals';

describe('fetch polyfill', () => {
  it('provides global.fetch', () => {
    expect(global.fetch).toBeDefined();
  });
});
