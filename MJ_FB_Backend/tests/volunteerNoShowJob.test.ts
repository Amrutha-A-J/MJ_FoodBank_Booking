process.env.NODE_ENV = 'development';
jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/emailUtils', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/config/coordinatorEmails.json', () => ({ coordinatorEmails: ['coord@example.com'] }));
jest.mock('../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

const volunteerJobs = require('../src/utils/volunteerShiftReminderJob');
const { markPastVolunteerNoShows, startVolunteerNoShowJob, stopVolunteerNoShowJob } = volunteerJobs;
const { sendEmail } = require('../src/utils/emailUtils');
const pool = require('../src/db').default;

describe('markPastVolunteerNoShows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [
        { first_name: 'Jane', last_name: 'Doe', date: '2024-01-01', start_time: '09:00:00', end_time: '12:00:00' },
      ],
    });
  });

  it('marks past bookings and notifies coordinators', async () => {
    await markPastVolunteerNoShows();
    expect(pool.query).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      'coord@example.com',
      expect.stringContaining('no-show'),
      expect.stringContaining('Jane Doe'),
    );
  });
});

describe('startVolunteerNoShowJob/stopVolunteerNoShowJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let runSpy: jest.SpyInstance;
  beforeEach(() => {
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    runSpy = jest.spyOn(volunteerJobs, 'markPastVolunteerNoShows').mockResolvedValue();
  });

  afterEach(async () => {
    stopVolunteerNoShowJob();
    await Promise.resolve();
    scheduleMock.mockReset();
    runSpy.mockRestore();
  });

  it('schedules and stops the cron job', async () => {
    startVolunteerNoShowJob();
    await Promise.resolve();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 0 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopVolunteerNoShowJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
