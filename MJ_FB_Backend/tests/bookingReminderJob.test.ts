process.env.NODE_ENV = 'development';
jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
const bookingReminder = require('../src/utils/bookingReminderJob');
const {
  sendNextDayBookingReminders,
  startBookingReminderJob,
  stopBookingReminderJob,
} = bookingReminder;
import { fetchBookingsForReminder } from '../src/models/bookingRepository';
import { enqueueEmail } from '../src/utils/emailQueue';

jest.mock('../src/models/bookingRepository', () => ({
  fetchBookingsForReminder: jest.fn(),
}));

jest.mock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

describe('sendNextDayBookingReminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    process.env.NODE_ENV = 'development';
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
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

    await sendNextDayBookingReminders();

    expect(fetchBookingsForReminder).toHaveBeenCalledWith('2024-01-02');
    expect(enqueueEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringContaining('Reminder'),
      expect.stringContaining('2024-01-02'),
    );
  });
});

describe('startBookingReminderJob/stopBookingReminderJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let sendSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    sendSpy = jest
      .spyOn(bookingReminder, 'sendNextDayBookingReminders')
      .mockResolvedValue();
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopBookingReminderJob();
    await Promise.resolve();
    jest.useRealTimers();
    scheduleMock.mockReset();
    sendSpy.mockRestore();
    process.env.NODE_ENV = 'test';
  });

  it('schedules and stops the cron job', async () => {
    startBookingReminderJob();
    await Promise.resolve();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 9 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopBookingReminderJob();
    expect(stopMock).toHaveBeenCalled();
  });
});

