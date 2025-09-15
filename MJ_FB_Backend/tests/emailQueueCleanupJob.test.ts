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
    default: (cb: any, schedule: string, _runOnStart?: boolean, skipInTest?: boolean) =>
      actual.default(cb, schedule, false, skipInTest),
  };
});
jest.mock('../src/utils/opsAlert');
const job = require('../src/utils/emailQueueCleanupJob');
const {
  cleanupEmailQueue,
  startEmailQueueCleanupJob,
  stopEmailQueueCleanupJob,
} = job;
import pool from '../src/db';
import logger from '../src/utils/logger';
import config from '../src/config';
import { alertOps, notifyOps } from '../src/utils/opsAlert';

describe('cleanupEmailQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes stale rows and logs size', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockResolvedValueOnce({ rows: [{ count: '5' }] });
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await cleanupEmailQueue();
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM email_queue WHERE next_attempt < (CURRENT_DATE - $1::int * INTERVAL '1 day')",
      [config.emailQueueMaxAgeDays],
    );
    expect(pool.query).toHaveBeenNthCalledWith(2, 'SELECT COUNT(*) FROM email_queue');
    expect(infoSpy).toHaveBeenCalledWith('Email queue size', { size: 5 });
  });

  it('warns and notifies when queue size exceeds threshold', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ count: String(config.emailQueueWarningSize + 1) }] });
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    await cleanupEmailQueue();
    expect(warnSpy).toHaveBeenCalledWith('Email queue size exceeds threshold', {
      size: config.emailQueueWarningSize + 1,
      threshold: config.emailQueueWarningSize,
    });
    expect(notifyOps).toHaveBeenCalled();
  });

  it('alerts ops on failure', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await cleanupEmailQueue();
    expect(alertOps).toHaveBeenCalled();
  });
});

describe('startEmailQueueCleanupJob/stopEmailQueueCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopEmailQueueCleanupJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startEmailQueueCleanupJob();
    expect(scheduleMock).toHaveBeenCalledWith('0 3 * * *', expect.any(Function), {
      timezone: 'America/Regina',
    });
    stopEmailQueueCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

