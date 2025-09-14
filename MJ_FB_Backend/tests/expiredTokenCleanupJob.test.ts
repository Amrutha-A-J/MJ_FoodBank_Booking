jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
const job = require('../src/utils/expiredTokenCleanupJob');
const {
  cleanupExpiredTokens,
  startExpiredTokenCleanupJob,
  stopExpiredTokenCleanupJob,
} = job;
import pool from '../src/db';
import logger from '../src/utils/logger';

describe('cleanupExpiredTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes expired password setup and email verification tokens', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rowCount: 1 });
    await cleanupExpiredTokens();
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM password_setup_tokens WHERE expires_at < (CURRENT_DATE - INTERVAL '10 days')",
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM client_email_verifications WHERE expires_at < (CURRENT_DATE - INTERVAL '10 days')",
    );
  });

  it('logs an error when the cleanup fails', async () => {
    const err = new Error('query failed');
    (pool.query as jest.Mock).mockRejectedValue(err);
    await cleanupExpiredTokens();
    expect(logger.error).toHaveBeenCalledWith('Failed to clean up expired tokens', err);
  });
});

describe('startExpiredTokenCleanupJob/stopExpiredTokenCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopExpiredTokenCleanupJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startExpiredTokenCleanupJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 3 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopExpiredTokenCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
