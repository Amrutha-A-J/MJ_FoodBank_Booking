jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

jest.mock('../src/utils/payPeriodSeeder', () => ({
  seedPayPeriods: jest.fn(),
}), { virtual: true });

jest.doMock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});

import { startPayPeriodCronJob, stopPayPeriodCronJob } from '../src/utils/payPeriodCronJob';

describe('startPayPeriodCronJob/stopPayPeriodCronJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopPayPeriodCronJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
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
