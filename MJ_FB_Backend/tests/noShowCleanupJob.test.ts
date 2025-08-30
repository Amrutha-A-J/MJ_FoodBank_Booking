process.env.NODE_ENV = 'development';
jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
const noShowJob = require('../src/utils/noShowCleanupJob');
const {
  cleanupNoShows,
  startNoShowCleanupJob,
  stopNoShowCleanupJob,
} = noShowJob;
import pool from '../src/db';
jest.mock('../src/db');

describe('cleanupNoShows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks past approved bookings as no_show', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    await cleanupNoShows();
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE bookings SET status='no_show' WHERE status='approved' AND date < CURRENT_DATE",
    );
  });
});

describe('startNoShowCleanupJob/stopNoShowCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let cleanupSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    cleanupSpy = jest.spyOn(noShowJob, 'cleanupNoShows').mockResolvedValue();
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopNoShowCleanupJob();
    await Promise.resolve();
    jest.useRealTimers();
    scheduleMock.mockReset();
    cleanupSpy.mockRestore();
    process.env.NODE_ENV = 'test';
  });

  it('schedules and stops the cron job', async () => {
    startNoShowCleanupJob();
    await Promise.resolve();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 20 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopNoShowCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
