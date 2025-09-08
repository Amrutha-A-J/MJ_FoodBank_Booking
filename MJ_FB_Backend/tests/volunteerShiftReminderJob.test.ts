jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

jest.doMock('../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));
jest.doMock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));
jest.doMock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
jest.mock('../src/utils/opsAlert');

const pool = require('../src/db').default;
const volunteerShiftReminder = require('../src/utils/volunteerShiftReminderJob');
const {
  sendNextDayVolunteerShiftReminders,
  startVolunteerShiftReminderJob,
  stopVolunteerShiftReminderJob,
} = volunteerShiftReminder;
import { alertOps } from '../src/utils/opsAlert';

describe('sendNextDayVolunteerShiftReminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('alerts ops on failure', async () => {
    (pool.query as jest.Mock).mockRejectedValue(new Error('boom'));
    await sendNextDayVolunteerShiftReminders();
    expect(alertOps).toHaveBeenCalledWith(
      'sendNextDayVolunteerShiftReminders',
      expect.any(Error),
    );
  });
});

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

