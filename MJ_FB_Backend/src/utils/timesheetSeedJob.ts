import cron from 'node-cron';
import seedTimesheets from './timesheetSeeder';

/**
 * Ensure timesheets exist for active staff each day.
 */
let task: cron.ScheduledTask | undefined;

export const startTimesheetSeedJob = (): void => {
  if (task) return;
  task = cron.schedule(
    '5 0 * * *',
    () => {
      void seedTimesheets();
    },
    { timezone: 'America/Regina' },
  );
};

export const stopTimesheetSeedJob = (): void => {
  if (task) {
    task.stop();
    task = undefined;
  }
};

