jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
import * as volunteerJob from '../src/utils/volunteerShiftReminderJob';
const { startVolunteerShiftReminderJob, stopVolunteerShiftReminderJob } = volunteerJob;

describe('startVolunteerShiftReminderJob/stopVolunteerShiftReminderJob', () => {
  let scheduleMock: jest.Mock;
  let stopMock: jest.Mock;
  let sendSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    scheduleMock = require('node-cron').schedule as jest.Mock;
    stopMock = jest.fn();
    scheduleMock.mockReturnValue({ stop: stopMock, start: jest.fn() });
    sendSpy = jest
      .spyOn(volunteerJob, 'sendNextDayVolunteerShiftReminders')
      .mockResolvedValue();
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopVolunteerShiftReminderJob();
    await Promise.resolve();
    jest.useRealTimers();
    scheduleMock.mockReset();
    sendSpy.mockRestore();
    process.env.NODE_ENV = 'test';
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
