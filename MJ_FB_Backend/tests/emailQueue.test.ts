import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

interface Job {
  id: number;
  to: string;
  templateId: number;
  params: Record<string, unknown>;
  retries: number;
  next_attempt: number;
}

const jobs: Job[] = [];
let idCounter = 1;

const db = {
  query: jest.fn(async (sql: string, params: any[] = []) => {
    if (sql.startsWith('INSERT INTO email_queue')) {
      const job: Job = {
        id: idCounter++,
        to: params[0],
        templateId: params[1],
        params: params[2],
        retries: params[3],
        next_attempt: Date.now(),
      };
      jobs.push(job);
      return { rows: [{ id: job.id }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT next_attempt FROM email_queue')) {
      if (jobs.length === 0) return { rows: [], rowCount: 0 };
      const job = [...jobs].sort((a, b) => a.next_attempt - b.next_attempt)[0];
      return { rows: [{ next_attempt: new Date(job.next_attempt) }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT id, recipient as to, template_id')) {
      const now = Date.now();
      const job = jobs.filter((j) => j.next_attempt <= now).sort((a, b) => a.id - b.id)[0];
      if (!job) return { rows: [], rowCount: 0 };
      return { rows: [{ ...job, next_attempt: new Date(job.next_attempt) }], rowCount: 1 };
    }
    if (sql.startsWith('UPDATE email_queue SET retries')) {
      const newRetries = params[0];
      const delay = params[1];
      const id = params[2];
      const job = jobs.find((j) => j.id === id);
      if (job) {
        job.retries = newRetries;
        job.next_attempt = Date.now() + delay;
      }
      return { rowCount: job ? 1 : 0 };
    }
    if (sql.startsWith('DELETE FROM email_queue')) {
      const id = params[0];
      const idx = jobs.findIndex((j) => j.id === id);
      if (idx >= 0) jobs.splice(idx, 1);
      return { rowCount: idx >= 0 ? 1 : 0 };
    }
    throw new Error('Unknown SQL: ' + sql);
  }),
};

function mockDb() {
  jest.doMock('../src/db', () => ({ __esModule: true, default: db }));
}

describe('persistent email queue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    const { shutdownQueue } = require('../src/utils/emailQueue');
    shutdownQueue();
    jest.useRealTimers();
    jest.clearAllTimers();
    jest.resetModules();
    jest.clearAllMocks();
    jobs.length = 0;
    idCounter = 1;
    delete process.env.EMAIL_QUEUE_MAX_RETRIES;
    delete process.env.EMAIL_QUEUE_BACKOFF_MS;
  });

  it('retries failed jobs with exponential backoff', async () => {
    process.env.EMAIL_QUEUE_MAX_RETRIES = '2';
    process.env.EMAIL_QUEUE_BACKOFF_MS = '1';
    const sendTemplatedEmailMock: jest.Mock = jest
      .fn()
      // @ts-ignore
      .mockRejectedValueOnce(new Error('fail1'))
      // @ts-ignore
      .mockRejectedValueOnce(new Error('fail2'))
      // @ts-ignore
      .mockResolvedValueOnce(undefined);
    jest.doMock('../src/utils/emailUtils', () => ({ sendTemplatedEmail: sendTemplatedEmailMock }));
    mockDb();
    const { enqueueEmail } = require('../src/utils/emailQueue');

    enqueueEmail({ to: 'user@example.com', templateId: 1, params: { body: 'Body' } });
    await Promise.resolve();
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTemplatedEmailMock.mock.calls[0][0]).toEqual({
      to: 'user@example.com',
      templateId: 1,
      params: { body: 'Body' },
    });

    await jest.advanceTimersByTimeAsync(1);
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2);
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(3);
  });

  it('resumes pending jobs after a restart', async () => {
    process.env.EMAIL_QUEUE_MAX_RETRIES = '2';
    process.env.EMAIL_QUEUE_BACKOFF_MS = '1';
    const sendTemplatedEmailMock: jest.Mock = jest
      .fn()
      // @ts-ignore
      .mockRejectedValueOnce(new Error('fail1'))
      // @ts-ignore
      .mockResolvedValueOnce(undefined);
    jest.doMock('../src/utils/emailUtils', () => ({ sendTemplatedEmail: sendTemplatedEmailMock }));
    mockDb();
    const { enqueueEmail } = require('../src/utils/emailQueue');

    enqueueEmail({ to: 'user@example.com', templateId: 1, params: { body: 'Body' } });
    await Promise.resolve();
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTemplatedEmailMock.mock.calls[0][0]).toEqual({
      to: 'user@example.com',
      templateId: 1,
      params: { body: 'Body' },
    });

    // simulate restart before retry
    jest.clearAllTimers();
    jest.resetModules();
    jest.doMock('../src/utils/emailUtils', () => ({ sendTemplatedEmail: sendTemplatedEmailMock }));
    mockDb();
    require('../src/utils/emailQueue');

    await jest.advanceTimersByTimeAsync(1);
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after max retries', async () => {
    process.env.EMAIL_QUEUE_MAX_RETRIES = '1';
    process.env.EMAIL_QUEUE_BACKOFF_MS = '1';
    const sendTemplatedEmailMock: jest.Mock = jest
      .fn()
      .mockRejectedValue(new Error('fail') as any);
    jest.doMock('../src/utils/emailUtils', () => ({ sendTemplatedEmail: sendTemplatedEmailMock }));
    const logger = require('../src/utils/logger').default;
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    mockDb();
    const { enqueueEmail } = require('../src/utils/emailQueue');

    enqueueEmail({ to: 'user@example.com', templateId: 1, params: { body: 'Body' } });
    await Promise.resolve();
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2);
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('Failed to send email job after max retries', expect.any(Error));
  });
});

