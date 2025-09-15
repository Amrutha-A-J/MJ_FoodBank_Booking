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
const { enqueueEmail } = require('../src/utils/emailQueue');
const volunteerShiftReminder = require('../src/utils/volunteerShiftReminderJob');
const {
  sendNextDayVolunteerShiftReminders,
  startVolunteerShiftReminderJob,
  stopVolunteerShiftReminderJob,
} = volunteerShiftReminder;
import { alertOps } from '../src/utils/opsAlert';
import logger from '../src/utils/logger';
import { formatReginaDateWithDay, formatTimeToAmPm } from '../src/utils/dateUtils';

describe('sendNextDayVolunteerShiftReminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('queues reminders for upcoming shifts', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          email: 'vol@example.com',
          volunteer_id: 1,
          start_time: '09:00:00',
          end_time: '10:00:00',
          reschedule_token: 'abc123',
        },
      ],
      rowCount: 1,
    });

    await sendNextDayVolunteerShiftReminders();

    const formattedDate = formatReginaDateWithDay('2024-01-02');
    const body = `Date: ${formattedDate} from ${formatTimeToAmPm('09:00:00')} to ${formatTimeToAmPm('10:00:00')}`;
    const base = process.env.FRONTEND_ORIGIN!.split(',')[0];
    expect(enqueueEmail).toHaveBeenCalledWith({
      to: 'vol@example.com',
      templateId: 0,
      params: {
        body,
        cancelLink: `${base}/cancel/abc123`,
        rescheduleLink: `${base}/reschedule/abc123`,
        type: 'Volunteer Shift',
      },
    });
  });

  it('sends no reminders when there are no shifts', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
    await sendNextDayVolunteerShiftReminders();
    expect(enqueueEmail).not.toHaveBeenCalled();
  });

  it('logs and alerts ops when queueing fails', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          email: 'vol@example.com',
          volunteer_id: 1,
          start_time: null,
          end_time: null,
          reschedule_token: 'oops',
        },
      ],
      rowCount: 1,
    });
    const err = new Error('queue failed');
    (enqueueEmail as jest.Mock).mockImplementation(() => {
      throw err;
    });

    await sendNextDayVolunteerShiftReminders();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to send volunteer shift reminders',
      err,
    );
    expect(alertOps).toHaveBeenCalledWith(
      'sendNextDayVolunteerShiftReminders',
      err,
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
      '0 19 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    expect(querySpy).not.toHaveBeenCalled();
    stopVolunteerShiftReminderJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

