import { sendNextDayVolunteerShiftReminders } from '../src/utils/volunteerShiftReminderJob';
import pool from '../src/db';
import { enqueueEmail } from '../src/utils/emailQueue';

jest.mock('../src/db');
jest.mock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

describe('sendNextDayVolunteerShiftReminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('queries next-day volunteer bookings and queues reminder emails', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        { email: 'vol@example.com', start_time: '09:00:00', end_time: '12:00:00' },
      ],
    });

    await sendNextDayVolunteerShiftReminders();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM volunteer_bookings'),
      ['2024-01-02'],
    );
    expect(enqueueEmail).toHaveBeenCalledWith(
      'vol@example.com',
      expect.stringContaining('Reminder'),
      expect.stringContaining('2024-01-02'),
    );
  });
});

