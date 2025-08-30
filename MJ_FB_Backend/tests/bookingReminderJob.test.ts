import * as bookingReminder from '../src/utils/bookingReminderJob';
const { sendNextDayBookingReminders, startBookingReminderJob, stopBookingReminderJob } = bookingReminder;
import { fetchBookings } from '../src/models/bookingRepository';
import { enqueueEmail } from '../src/utils/emailQueue';

jest.mock('../src/models/bookingRepository', () => ({
  fetchBookings: jest.fn(),
}));

jest.mock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

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
    (fetchBookings as jest.Mock).mockResolvedValue([
      {
        user_email: 'user@example.com',
        start_time: '09:00:00',
        end_time: '10:00:00',
      },
    ]);

    await sendNextDayBookingReminders();

    expect(fetchBookings).toHaveBeenCalledWith('approved', '2024-01-02');
    expect(enqueueEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringContaining('Reminder'),
      expect.stringContaining('2024-01-02'),
    );
  });
});

describe('startBookingReminderJob/stopBookingReminderJob', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let sendSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    setIntervalSpy = jest.spyOn(global, 'setInterval');
    clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    sendSpy = jest
      .spyOn(bookingReminder, 'sendNextDayBookingReminders')
      .mockResolvedValue();
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopBookingReminderJob();
    await Promise.resolve();
    jest.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    sendSpy.mockRestore();
    process.env.NODE_ENV = 'test';
  });

  it('sets and clears the interval', async () => {
    startBookingReminderJob();
    await Promise.resolve();
    expect(setInterval).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
    stopBookingReminderJob();
    expect(clearInterval).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

