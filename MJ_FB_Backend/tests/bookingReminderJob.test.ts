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
        params: expect.objectContaining({ body: expect.stringContaining('2024-01-02') }),
      }),
    );
  });

  it('surfaces failures from enqueueEmail immediately', async () => {
    (fetchBookingsForReminder as jest.Mock).mockResolvedValue([
      {
        user_email: 'user@example.com',
        reschedule_token: 'tok',
      },
    ]);
    (enqueueEmail as jest.Mock).mockRejectedValue(new Error('fail'));

    await sendNextDayBookingReminders().then(
      () => {
        throw new Error('expected rejection');
      },
      (err: unknown) => {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('fail');
      },
    );
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
      '0 9 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopBookingReminderJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

