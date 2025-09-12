import { isHoliday, setHolidays } from '../src/utils/holidayCache';
import { hasTable } from '../src/utils/dbUtils';

jest.mock('../src/utils/dbUtils');

describe('holiday cache', () => {
  beforeEach(() => {
    setHolidays(null);
    (hasTable as jest.Mock).mockReset();
  });

  it('skips querying when holidays table does not exist', async () => {
    (hasTable as jest.Mock).mockResolvedValue(false);
    const client = { query: jest.fn() } as any;
    const result = await isHoliday('2025-02-15', client);
    expect(result).toBe(false);
    expect(hasTable).toHaveBeenCalledWith('holidays', client);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('queries holidays table when present', async () => {
    (hasTable as jest.Mock).mockResolvedValue(true);
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ date: '2025-12-25', reason: 'Christmas' }],
      }),
    } as any;
    const result = await isHoliday('2025-12-25', client);
    expect(result).toBe(true);
    expect(client.query).toHaveBeenCalledWith(
      'SELECT date, reason FROM holidays ORDER BY date',
    );
  });

  it('throws when query fails with provided client', async () => {
    (hasTable as jest.Mock).mockResolvedValue(true);
    const client = {
      query: jest.fn().mockRejectedValue(new Error('boom')),
    } as any;
    await expect(isHoliday('2025-12-25', client)).rejects.toThrow('boom');
  });
});
