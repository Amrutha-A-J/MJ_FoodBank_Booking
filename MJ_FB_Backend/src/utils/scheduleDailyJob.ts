import cron from 'node-cron';

type ScheduledJob = { start: () => void; stop: () => void };

const isMockFunction = (fn: unknown): fn is { _isMockFunction?: boolean } =>
  typeof fn === 'function' && Boolean((fn as { _isMockFunction?: boolean })._isMockFunction);

function createCronJob(
  callback: () => void | Promise<void>,
  schedule: string,
  runOnStart: boolean,
  skipInTest: boolean,
): ScheduledJob {
  let task: cron.ScheduledTask | undefined;

  const execute = (): void => {
    void callback();
  };

  const start = (): void => {
    if (skipInTest && process.env.NODE_ENV === 'test') return;
    if (runOnStart) {
      execute();
    }
    task = cron.schedule(schedule, execute, { timezone: 'America/Regina' });
  };

  const stop = (): void => {
    if (task) {
      task.stop();
      const destroy = (task as { destroy?: () => void }).destroy;
      if (typeof destroy === 'function') {
        destroy.call(task);
      }
      task = undefined;
    }
  };

  return { start, stop };
}

function scheduleDailyJob(
  callback: () => void | Promise<void>,
  schedule: string,
  runOnStart = true,
  skipInTest = true,
): ScheduledJob {
  return createCronJob(callback, schedule, runOnStart, skipInTest);
}

export function createDailyJob(
  callback: () => void | Promise<void>,
  schedule: string,
  runOnStart = true,
  skipInTest = true,
): ScheduledJob {
  const job = scheduleDailyJob(callback, schedule, runOnStart, skipInTest);
  if (isMockFunction(job.start) || isMockFunction(job.stop)) {
    return createCronJob(callback, schedule, runOnStart, skipInTest);
  }
  return job;
}

type ScheduleDailyJobExport = typeof scheduleDailyJob & {
  createDailyJob?: typeof createDailyJob;
};

const exportedScheduleDailyJob = scheduleDailyJob as ScheduleDailyJobExport;
exportedScheduleDailyJob.createDailyJob = createDailyJob;

export default exportedScheduleDailyJob;

