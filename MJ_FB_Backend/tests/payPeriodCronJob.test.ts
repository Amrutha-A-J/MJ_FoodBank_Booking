jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

jest.mock('../src/utils/payPeriodSeeder', () => ({ seedPayPeriods: jest.fn() }));

let startPayPeriodCronJob: () => void;
let stopPayPeriodCronJob: () => void;
let seedPayPeriods: jest.Mock;

describe('startPayPeriodCronJob/stopPayPeriodCronJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-01T00:00:00Z'));
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    seedPayPeriods = require('../src/utils/payPeriodSeeder').seedPayPeriods as jest.Mock;
    ({ startPayPeriodCronJob, stopPayPeriodCronJob } = require('../src/utils/payPeriodCronJob'));
  });

  afterEach(() => {
    stopPayPeriodCronJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
    seedPayPeriods.mockReset();
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
