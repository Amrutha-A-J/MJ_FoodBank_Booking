const cronScheduleMock = jest.fn();
jest.mock(
  'node-cron',
  () => ({
    __esModule: true,
    default: { schedule: cronScheduleMock },
    schedule: cronScheduleMock,
  }),
  { virtual: true },
);
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
const job = require('../src/utils/passwordTokenCleanupJob');
const {
  cleanupPasswordTokens,
  startPasswordTokenCleanupJob,
  stopPasswordTokenCleanupJob,
} = job;
import pool from '../src/db';

describe('cleanupPasswordTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes used or expired tokens', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    await cleanupPasswordTokens();
    expect(pool.query).toHaveBeenCalledWith(
      "DELETE FROM password_setup_tokens WHERE used=true OR expires_at < CURRENT_DATE - INTERVAL '10 days'",
    );
  });
});

describe('startPasswordTokenCleanupJob/stopPasswordTokenCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopPasswordTokenCleanupJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startPasswordTokenCleanupJob();
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 1 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopPasswordTokenCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
