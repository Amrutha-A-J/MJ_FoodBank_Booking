jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
jest.mock('../src/utils/opsAlert');
const job = require('../src/utils/volunteerNoShowCleanupJob');
const {
  cleanupVolunteerNoShows,
  startVolunteerNoShowCleanupJob,
  stopVolunteerNoShowCleanupJob,
} = job;
import pool from '../src/db';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
jest.mock('../src/utils/emailUtils');
import { alertOps } from '../src/utils/opsAlert';

describe('cleanupVolunteerNoShows', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-02T12:00:00Z'));
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [{ id: 1 }] });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('marks past approved volunteer bookings as no_show without notifying coordinators', async () => {
    await cleanupVolunteerNoShows();
    const [query, params] = (pool.query as jest.Mock).mock.calls[0];
    expect(query).toContain("NOW() - $1::int * INTERVAL '1 hour'");
    expect(params).toEqual([24]);
    expect(query).toContain('FROM volunteer_slots');
    expect(query).toContain('vb.date + vs.end_time');
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
  });

  it('alerts ops on failure', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await cleanupVolunteerNoShows();
    expect(alertOps).toHaveBeenCalled();
  });
});

describe('startVolunteerNoShowCleanupJob/stopVolunteerNoShowCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopVolunteerNoShowCleanupJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startVolunteerNoShowCleanupJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 20 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopVolunteerNoShowCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
