jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});

const { startTimesheetSeedJob, stopTimesheetSeedJob } = require('../src/utils/timesheetSeedJob');

describe('startTimesheetSeedJob/stopTimesheetSeedJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopTimesheetSeedJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startTimesheetSeedJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '5 0 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopTimesheetSeedJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

