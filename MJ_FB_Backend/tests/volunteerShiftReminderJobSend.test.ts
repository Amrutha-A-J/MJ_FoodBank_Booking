jest.mock('../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

jest.mock('../src/config', () => ({
  __esModule: true,
  default: {
    volunteerBookingReminderTemplateId: 99,
    frontendOrigins: ['http://localhost:5173'],
  },
}));

const { sendNextDayVolunteerShiftReminders } = require('../src/utils/volunteerShiftReminderJob');
const db = require('../src/db').default;
const { enqueueEmail } = require('../src/utils/emailQueue');

describe('sendNextDayVolunteerShiftReminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('queues reminder emails with the configured template ID', async () => {
    (db.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          email: 'vol@example.com',
          start_time: '09:00:00',
          end_time: '11:00:00',
          reschedule_token: 'tok',
        },
      ],
    });

    await sendNextDayVolunteerShiftReminders();

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['2024-01-02']);
    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'vol@example.com',
        templateId: 99,
      }),
    );
  });
});

