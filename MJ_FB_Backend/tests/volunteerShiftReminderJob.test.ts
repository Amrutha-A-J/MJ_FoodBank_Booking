import * as volunteerJob from '../src/utils/volunteerShiftReminderJob';
const { startVolunteerShiftReminderJob, stopVolunteerShiftReminderJob } = volunteerJob;

describe('startVolunteerShiftReminderJob/stopVolunteerShiftReminderJob', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let sendSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    setIntervalSpy = jest.spyOn(global, 'setInterval');
    clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    sendSpy = jest
      .spyOn(volunteerJob, 'sendNextDayVolunteerShiftReminders')
      .mockResolvedValue();
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    stopVolunteerShiftReminderJob();
    await Promise.resolve();
    jest.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    sendSpy.mockRestore();
    process.env.NODE_ENV = 'test';
  });

  it('sets and clears the interval', async () => {
    startVolunteerShiftReminderJob();
    await Promise.resolve();
    expect(setInterval).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
    stopVolunteerShiftReminderJob();
    expect(clearInterval).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
