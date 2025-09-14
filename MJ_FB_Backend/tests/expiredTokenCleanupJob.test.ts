jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
import pool from '../src/db';

describe('cleanupExpiredTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes expired password setup and email verification tokens', async () => {
    const { cleanupExpiredTokens } = require('../src/utils/expiredTokenCleanupJob');
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
});

describe('startExpiredTokenCleanupJob/stopExpiredTokenCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let startExpiredTokenCleanupJob: () => void;
  let stopExpiredTokenCleanupJob: () => void;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    ({ startExpiredTokenCleanupJob, stopExpiredTokenCleanupJob } = require('../src/utils/expiredTokenCleanupJob'));
  });

  afterEach(() => {
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startExpiredTokenCleanupJob();
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 3 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopExpiredTokenCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
