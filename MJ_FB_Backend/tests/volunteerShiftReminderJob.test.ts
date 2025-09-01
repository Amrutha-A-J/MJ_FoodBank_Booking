jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
const volunteerJob = require('../src/utils/volunteerShiftReminderJob');
const {
  startVolunteerShiftReminderJob,
  stopVolunteerShiftReminderJob,
} = volunteerJob;
import pool from '../src/db';
jest.mock('../src/db');
import { enqueueEmail } from '../src/utils/emailQueue';
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));

describe('startVolunteerShiftReminderJob/stopVolunteerShiftReminderJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let originalEnv: string | undefined;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
    (enqueueEmail as jest.Mock).mockResolvedValue(undefined);
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopVolunteerShiftReminderJob();
    await Promise.resolve();
    jest.useRealTimers();
    scheduleMock.mockReset();
    (pool.query as jest.Mock).mockReset();
    (enqueueEmail as jest.Mock).mockReset();
    process.env.NODE_ENV = originalEnv;
  });

  it('schedules and stops the cron job', async () => {
    startVolunteerShiftReminderJob();
    await Promise.resolve();
    expect(scheduleMock).toHaveBeenCalledWith(
      '0 9 * * *',
      expect.any(Function),
      { timezone: 'America/Regina' },
    );
    stopVolunteerShiftReminderJob();
    expect(stopMock).toHaveBeenCalled();
  });
});
