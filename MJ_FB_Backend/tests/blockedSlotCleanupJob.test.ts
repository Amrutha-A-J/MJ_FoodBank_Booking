jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
const job = require('../src/utils/blockedSlotCleanupJob');
const {
  cleanupPastBlockedSlots,
  startBlockedSlotCleanupJob,
  stopBlockedSlotCleanupJob,
} = job;
import pool from '../src/db';

describe('cleanupPastBlockedSlots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes past blocked slots', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    await cleanupPastBlockedSlots();
    expect(pool.query).toHaveBeenCalledWith(
      'DELETE FROM blocked_slots WHERE date < CURRENT_DATE',
    );
  });
});

describe('startBlockedSlotCleanupJob/stopBlockedSlotCleanupJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopBlockedSlotCleanupJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startBlockedSlotCleanupJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 2 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopBlockedSlotCleanupJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
