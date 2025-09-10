jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });

jest.doMock('../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));
jest.doMock('../src/models/bookingRepository', () => ({
  fetchBookingsForReminder: jest.fn(),
}));
jest.doMock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));
jest.mock('../src/utils/opsAlert');

jest.doMock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});

const { fetchBookingsForReminder } = require('../src/models/bookingRepository');
const { enqueueEmail } = require('../src/utils/emailQueue');
const bookingReminder = require('../src/utils/bookingReminderJob');
const {
  sendNextDayBookingReminders,
  startBookingReminderJob,
  stopBookingReminderJob,
} = bookingReminder;
const db = require('../src/db').default;
import { alertOps, notifyOps } from '../src/utils/opsAlert';

test('does not query database on import', () => {
  expect(db.query).not.toHaveBeenCalled();
});

describe('sendNextDayBookingReminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('fetches next-day bookings and queues reminder emails', async () => {
    (fetchBookingsForReminder as jest.Mock).mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        user_email: 'user@example.com',
        start_time: '09:00:00',
        end_time: '10:00:00',
        reschedule_token: 'tok',
      },
    ]);
    (enqueueEmail as jest.Mock).mockResolvedValue(undefined);

    await sendNextDayBookingReminders();

    expect(fetchBookingsForReminder).toHaveBeenCalledWith('2024-01-02');
    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        templateId: expect.any(Number),
        params: expect.objectContaining({
          body: expect.stringContaining('Tue, Jan 2, 2024'),
        }),
      }),
    );
    expect(notifyOps).toHaveBeenCalledWith(
      expect.stringContaining('sendNextDayBookingReminders queued reminders for'),
    );
    expect((notifyOps as jest.Mock).mock.calls[0][0]).toContain('user@example.com');
    expect(db.query).toHaveBeenCalledWith(
      'UPDATE bookings SET reminder_sent = true WHERE id = $1',
      [1],
    );
  });

  it('alerts ops and surfaces failures from enqueueEmail', async () => {
    (fetchBookingsForReminder as jest.Mock).mockResolvedValue([
      {
        user_email: 'user@example.com',
        reschedule_token: 'tok',
      },
    ]);
    (enqueueEmail as jest.Mock).mockRejectedValue(new Error('fail'));

    await expect(sendNextDayBookingReminders()).rejects.toThrow('fail');
    expect(alertOps).toHaveBeenCalledWith(
      'sendNextDayBookingReminders',
      expect.any(Error),
    );
  });

  it('marks reminders as sent so bookings are queued only once', async () => {
    (fetchBookingsForReminder as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 1,
          user_id: 1,
          user_email: 'user@example.com',
          start_time: '09:00:00',
          end_time: '10:00:00',
          reschedule_token: 'tok',
        },
      ])
      .mockResolvedValueOnce([]);
    (enqueueEmail as jest.Mock).mockResolvedValue(undefined);

    await sendNextDayBookingReminders();
    await sendNextDayBookingReminders();

    expect(fetchBookingsForReminder).toHaveBeenCalledTimes(2);
    expect(enqueueEmail).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      'UPDATE bookings SET reminder_sent = true WHERE id = $1',
      [1],
    );
  });

  it('skips new clients when email reminders are disabled', async () => {
    (fetchBookingsForReminder as jest.Mock).mockResolvedValue([]);
    await sendNextDayBookingReminders();
    expect(fetchBookingsForReminder).toHaveBeenCalledWith('2024-01-02');
    expect(enqueueEmail).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('startBookingReminderJob/stopBookingReminderJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
  });

  afterEach(() => {
    stopBookingReminderJob();
    jest.useRealTimers();
    scheduleMock.mockReset();
  });

  it('schedules and stops the cron job', () => {
    startBookingReminderJob();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 19 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopBookingReminderJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

describe('fetchBookingsForReminder', () => {
  afterEach(() => {
    (db.query as jest.Mock).mockReset();
  });

  it('joins user_preferences and filters out disabled reminders', async () => {
    const { fetchBookingsForReminder: realFetch } = jest.requireActual(
      '../src/models/bookingRepository',
    );
    (db.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] });
    await realFetch('2024-01-02');
    const query = (db.query as jest.Mock).mock.calls[1][0];
    expect(query).toContain('LEFT JOIN user_preferences');
    expect(query).toContain('up.user_id = b.user_id');
    expect(query).toContain('up.user_id = b.new_client_id');
    expect(query).toContain('COALESCE(up.email_reminders, true)');
    expect(query).toContain('LEFT JOIN new_clients');
  });

  it('omits new_clients join when table is missing', async () => {
    const { fetchBookingsForReminder: realFetch } = jest.requireActual(
      '../src/models/bookingRepository',
    );
    (db.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ exists: false }] })
      .mockResolvedValueOnce({ rows: [] });
    await realFetch('2024-01-02');
    const query = (db.query as jest.Mock).mock.calls[1][0];
    expect(query).not.toContain('new_clients');
  });
});

