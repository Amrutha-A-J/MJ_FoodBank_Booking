import cron from 'node-cron';

export default function scheduleDailyJob(
  callback: () => void | Promise<void>,
  schedule: string,
  runOnStart = true,
): { start: () => void; stop: () => void } {
  let task: cron.ScheduledTask | undefined;

  const start = (): void => {
    if (process.env.NODE_ENV === 'test') return;
    if (runOnStart) {
      void callback();
    }
    task = cron.schedule(
      schedule,
      () => {
        void callback();
      },
      { timezone: 'America/Regina' },
    );
  };

  const stop = (): void => {
    if (task) {
      task.stop();
      task = undefined;
    }
  };

  return { start, stop };
}

