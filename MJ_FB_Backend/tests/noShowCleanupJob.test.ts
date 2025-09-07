jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
jest.mock('../src/utils/opsAlert');
const noShowJob = require('../src/utils/noShowCleanupJob');
const {
  cleanupNoShows,
  startNoShowCleanupJob,
  stopNoShowCleanupJob,
} = noShowJob;
import pool from '../src/db';
import { alertOps } from '../src/utils/opsAlert';

describe('cleanupNoShows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks past approved bookings as no_show', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    await cleanupNoShows();
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE bookings SET status='no_show', note=NULL WHERE status='approved' AND date < CURRENT_DATE",
    );
  });

  it('alerts ops on failure', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await cleanupNoShows();
    expect(alertOps).toHaveBeenCalled();
  });
});

describe('startNoShowCleanupJob/stopNoShowCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopNoShowCleanupJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startNoShowCleanupJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 20 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopNoShowCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

describe('countVisitsAndBookingsForMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('excludes past approved bookings', async () => {
    const { countVisitsAndBookingsForMonth, getMonthRange } = require('../src/utils/bookingUtils');
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ total: '0' }] });
    const userId = 1;
    const date = '2024-05-15';
    await countVisitsAndBookingsForMonth(userId, date);
    const { start, end } = getMonthRange(date)!;
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status='approved' AND date BETWEEN $2 AND $3 AND date >= CURRENT_DATE"),
      [userId, start, end],
    );
  });
});
