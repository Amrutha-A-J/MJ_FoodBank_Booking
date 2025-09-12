import fs from 'fs';

describe('saveIcsFile', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    delete process.env.ICS_BASE_URL;
  });

  it('falls back to data URI when file write fails', async () => {
    process.env.ICS_BASE_URL = 'https://example.com/ics';
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('fail');
    });
    const { saveIcsFile } = await import('../src/utils/emailUtils');
    const result = saveIcsFile('test.ics', 'content');
    expect(result.startsWith('data:text/calendar')).toBe(true);
  });
});
