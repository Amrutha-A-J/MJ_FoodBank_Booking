import { seedPayPeriods } from './payPeriodSeeder';
import scheduleDailyJob from './scheduleDailyJob';

const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

/**
 * Seed pay periods for the upcoming year.
 */
export async function seedNextYear(): Promise<void> {
  const now = new Date();
  const nextYear = now.getFullYear() + 1;
  const start = `${nextYear}-01-01`;
  const end = `${nextYear}-12-31`;
  await seedPayPeriods(start, end);
}

let job: ReturnType<typeof createDailyJob> | undefined;

/**
 * Schedule the job to run annually on Nov 30.
 */
export function startPayPeriodCronJob(): void {
  if (!job) {
    job = createDailyJob(seedNextYear, '0 0 30 11 *', false, false);
  }
  job.start();
}

export function stopPayPeriodCronJob(): void {
  job?.stop();
  job = undefined;
}
