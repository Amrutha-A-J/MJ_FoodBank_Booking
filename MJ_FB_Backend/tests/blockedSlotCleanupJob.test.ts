jest.mock('../src/utils/opsAlert');
const job = require('../src/jobs/blockedSlotCleanupJob');
const { cleanupPastBlockedSlots, startBlockedSlotCleanupJob, stopBlockedSlotCleanupJob } = job;
import pool from '../src/db';
import { alertOps } from '../src/utils/opsAlert';

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

  it('alerts ops on failure', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await cleanupPastBlockedSlots();
    expect(alertOps).toHaveBeenCalled();
  });
});

describe('startBlockedSlotCleanupJob/stopBlockedSlotCleanupJob', () => {
  it('schedules and stops the cron job', () => {
    jest.useFakeTimers();
    const stopMock = jest.fn();
    const scheduleMock = jest.fn().mockReturnValue({ stop: stopMock, start: jest.fn() });

    startBlockedSlotCleanupJob(scheduleMock);
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 2 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopBlockedSlotCleanupJob();
    expect(stopMock).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
