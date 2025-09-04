jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

jest.doMock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});

jest.mock('../src/utils/payPeriodSeeder', () => ({ seedPayPeriods: jest.fn() }));

const { seedPayPeriods } = require('../src/utils/payPeriodSeeder');
const payPeriodJob = require('../src/utils/payPeriodCronJob');
const { startPayPeriodCronJob, stopPayPeriodCronJob } = payPeriodJob;

describe('startPayPeriodCronJob/stopPayPeriodCronJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-01T00:00:00Z'));
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    jest.clearAllMocks();
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

  it('stops the cron job', () => {
    startPayPeriodCronJob();
    stopPayPeriodCronJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
