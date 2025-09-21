import mockPool from './utils/mockDb';

jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

jest.mock('../src/utils/scheduleDailyJob', () => ({
  __esModule: true,
  default: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));

const scheduleDailyJob = require('../src/utils/scheduleDailyJob').default;
const job = require('../src/utils/bookingRetentionJob');
const { cleanupOldRecords } = job;

describe('bookingRetentionJob scheduling', () => {
  it('invokes scheduleDailyJob with nightly schedule', () => {
    expect(scheduleDailyJob).toHaveBeenCalledWith(
      cleanupOldRecords,
      '0 3 * * *',
      true,
      true,
    );
  });
});

describe('cleanupOldRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates volunteers, deletes old records, and vacuums tables', async () => {
    const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

    await cleanupOldRecords();

    const cutoff = new Date('2025-06-15T00:00:00Z');
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query.mock.calls[1][0]).toContain('UPDATE volunteers v');
    expect(mockClient.query.mock.calls[1][1]).toEqual([cutoff]);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      3,
      'DELETE FROM volunteer_bookings WHERE date < $1',
      [cutoff],
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(
      4,
      'DELETE FROM bookings WHERE date < $1',
      [cutoff],
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT');
    expect(mockClient.query).toHaveBeenNthCalledWith(
      6,
      'VACUUM (ANALYZE) volunteer_bookings',
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(
      7,
      'VACUUM (ANALYZE) bookings',
    );
  });

  it('allows specifying a reference date for manual cleanup', async () => {
    const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

    const reference = new Date('2026-01-01T00:00:00Z');
    await cleanupOldRecords(reference);

    const cutoff = new Date(reference);
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query.mock.calls[1][1]).toEqual([cutoff]);
  });
});

