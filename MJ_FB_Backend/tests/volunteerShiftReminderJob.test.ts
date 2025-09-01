jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

const sendNextDayVolunteerShiftRemindersMock = jest
  .fn()
  .mockResolvedValue(undefined);

jest.mock('../src/utils/volunteerShiftReminderJob', () => {
  const scheduleDailyJob = jest.requireActual(
    '../src/utils/scheduleDailyJob',
  ).default;
  const job = scheduleDailyJob(
    sendNextDayVolunteerShiftRemindersMock,
    '0 9 * * *',
    false,
    false,
  );
  return {
    __esModule: true,
    sendNextDayVolunteerShiftReminders: sendNextDayVolunteerShiftRemindersMock,
    startVolunteerShiftReminderJob: job.start,
    stopVolunteerShiftReminderJob: job.stop,
  };
});

import pool from '../src/db';
import {
  startVolunteerShiftReminderJob,
  stopVolunteerShiftReminderJob,
  sendNextDayVolunteerShiftReminders,
} from '../src/utils/volunteerShiftReminderJob';

describe('startVolunteerShiftReminderJob/stopVolunteerShiftReminderJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let querySpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    querySpy = jest.spyOn(pool, 'query');
  });

  afterEach(() => {
    stopVolunteerShiftReminderJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
    querySpy.mockRestore();
    (sendNextDayVolunteerShiftReminders as jest.Mock).mockReset();
  });

  it('schedules and stops the cron job without querying the database', () => {
    startVolunteerShiftReminderJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 9 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    expect(querySpy).not.toHaveBeenCalled();
    stopVolunteerShiftReminderJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

