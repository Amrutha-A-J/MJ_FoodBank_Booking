const originalEnv = process.env.NODE_ENV;
jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
const job = require('../src/utils/volunteerNoShowCleanupJob');
const {
  cleanupVolunteerNoShows,
  startVolunteerNoShowCleanupJob,
  stopVolunteerNoShowCleanupJob,
} = job;
import pool from '../src/db';
jest.mock('../src/db');
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { VOLUNTEER_NO_SHOW_NOTIFICATION_TEMPLATE_ID } from '../src/config/emailTemplates';
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
    const [query, params] = (pool.query as jest.Mock).mock.calls[0];
    expect(query).toContain("NOW() - $1::int * INTERVAL '1 hour'");
    expect(params).toEqual([24]);
    expect(query).toContain('FROM volunteer_slots');
    expect(query).toContain('vb.date + vs.end_time');
    expect(sendTemplatedEmail).toHaveBeenCalledTimes(2);
    expect(sendTemplatedEmail).toHaveBeenCalledWith({
      to: 'coordinator1@example.com',
      templateId: VOLUNTEER_NO_SHOW_NOTIFICATION_TEMPLATE_ID,
      params: { ids: '1' },
    });
    expect(sendTemplatedEmail).toHaveBeenCalledWith({
      to: 'coordinator2@example.com',
      templateId: VOLUNTEER_NO_SHOW_NOTIFICATION_TEMPLATE_ID,
      params: { ids: '1' },
    });
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
    cleanupSpy = jest.spyOn(job, 'cleanupVolunteerNoShows').mockResolvedValue(undefined);
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopVolunteerNoShowCleanupJob();
    await Promise.resolve();
    jest.useRealTimers();
    scheduleMock.mockReset();
    cleanupSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
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

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});
