process.env.NODE_ENV = 'development';
jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
const job = require('../src/utils/volunteerNoShowCleanupJob');
const {
  cleanupVolunteerNoShows,
  startVolunteerNoShowCleanupJob,
  stopVolunteerNoShowCleanupJob,
} = job;
import pool from '../src/db';
jest.mock('../src/db');
import { sendEmail } from '../src/utils/emailUtils';
jest.mock('../src/utils/emailUtils');

describe('cleanupVolunteerNoShows', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-02T12:00:00Z'));
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [{ id: 1 }] });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('marks past approved volunteer bookings as no_show and notifies coordinators', async () => {
    await cleanupVolunteerNoShows();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE volunteer_bookings'),
      ['2024-01-01'],
    );
    expect(sendEmail).toHaveBeenCalled();
  });
});

describe('startVolunteerNoShowCleanupJob/stopVolunteerNoShowCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let cleanupSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    cleanupSpy = jest.spyOn(job, 'cleanupVolunteerNoShows').mockResolvedValue();
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopVolunteerNoShowCleanupJob();
    await Promise.resolve();
    jest.useRealTimers();
    scheduleMock.mockReset();
    cleanupSpy.mockRestore();
    process.env.NODE_ENV = 'test';
  });

  it('schedules and stops the cron job', async () => {
    startVolunteerNoShowCleanupJob();
    await Promise.resolve();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 20 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopVolunteerNoShowCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
