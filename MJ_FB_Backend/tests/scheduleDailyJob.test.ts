jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

import cron from 'node-cron';
import scheduleDailyJob from '../src/utils/scheduleDailyJob';

describe('scheduleDailyJob', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  it('executes callback immediately when runOnStart is true', () => {
    const cb = jest.fn();
    const job = scheduleDailyJob(cb, '* * * * *', true, false);
    job.start();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cron.schedule).toHaveBeenCalledWith(
      '* * * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
  });

  it('skips scheduling in test environment when skipInTest is true', () => {
    const cb = jest.fn();
    process.env.NODE_ENV = 'test';
    const job = scheduleDailyJob(cb, '* * * * *', true, true);
    job.start();
    expect(cb).not.toHaveBeenCalled();
    expect(cron.schedule).not.toHaveBeenCalled();
  });
});

