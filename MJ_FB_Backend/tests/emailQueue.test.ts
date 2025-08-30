import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('emailQueue retry behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.EMAIL_QUEUE_MAX_RETRIES;
    delete process.env.EMAIL_QUEUE_BACKOFF_MS;
  });

  it('retries failed jobs with exponential backoff', async () => {
    process.env.EMAIL_QUEUE_MAX_RETRIES = '2';
    process.env.EMAIL_QUEUE_BACKOFF_MS = '1';
    const sendEmailMock: jest.Mock = jest.fn();
    // @ts-ignore
    sendEmailMock.mockRejectedValueOnce(new Error('fail1'));
    // @ts-ignore
    sendEmailMock.mockRejectedValueOnce(new Error('fail2'));
    // @ts-ignore
    sendEmailMock.mockResolvedValueOnce(undefined);
    jest.doMock('../src/utils/emailUtils', () => ({ sendEmail: sendEmailMock }));
    const { enqueueEmail } = require('../src/utils/emailQueue');

    enqueueEmail('user@example.com', 'Sub', 'Body');
    await Promise.resolve();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
  });

  it('stops retrying after max retries', async () => {
    process.env.EMAIL_QUEUE_MAX_RETRIES = '1';
    process.env.EMAIL_QUEUE_BACKOFF_MS = '1';
    // @ts-ignore
    const sendEmailMock: jest.Mock = jest.fn().mockRejectedValue(new Error('fail'));
    jest.doMock('../src/utils/emailUtils', () => ({ sendEmail: sendEmailMock }));
    const logger = require('../src/utils/logger').default;
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { enqueueEmail } = require('../src/utils/emailQueue');

    enqueueEmail('user@example.com', 'Sub', 'Body');
    await Promise.resolve();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('Failed to send email job after max retries', expect.any(Error));
  });
});
