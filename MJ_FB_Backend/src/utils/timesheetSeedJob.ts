import scheduleDailyJob from './scheduleDailyJob';
import seedTimesheets from './timesheetSeeder';

/**
 * Ensure timesheets exist for active staff each day.
 */
const timesheetSeedJob = scheduleDailyJob(
  () => seedTimesheets(),
  '5 0 * * *',
  false,
  true,
);

export const startTimesheetSeedJob = timesheetSeedJob.start;
export const stopTimesheetSeedJob = timesheetSeedJob.stop;

