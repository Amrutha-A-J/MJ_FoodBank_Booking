describe('global fetch', () => {
  it('is defined', () => {
    expect((global as any).fetch).toBeDefined();
  });
});

