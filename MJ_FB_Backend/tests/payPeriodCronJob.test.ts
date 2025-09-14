jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

jest.mock('../src/utils/payPeriodSeeder', () => ({ seedPayPeriods: jest.fn() }));
import { startPayPeriodCronJob, stopPayPeriodCronJob } from '../src/utils/payPeriodCronJob';
import { seedPayPeriods } from '../src/utils/payPeriodSeeder';

describe('startPayPeriodCronJob/stopPayPeriodCronJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-01T00:00:00Z'));
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    jest.clearAllMocks();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopPayPeriodCronJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
    (seedPayPeriods as jest.Mock).mockReset();
  });

  it('schedules annual pay period seeding and seeds next year', async () => {
    startPayPeriodCronJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 0 30 11 *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    const jobFn = scheduleMock.mock.calls[0][1];
    await jobFn();
    expect(seedPayPeriods).toHaveBeenCalledWith('2025-01-01', '2025-12-31');
  });

  it('schedules and stops the cron job', () => {
    startPayPeriodCronJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 0 30 11 *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopPayPeriodCronJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
