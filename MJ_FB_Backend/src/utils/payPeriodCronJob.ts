import scheduleDailyJob from './scheduleDailyJob';
import { seedPayPeriods } from './payPeriodSeeder';

async function seedNextYear(): Promise<void> {
  const nextYear = new Date().getFullYear() + 1;
  await seedPayPeriods(nextYear);
}

const payPeriodJob = scheduleDailyJob(seedNextYear, '0 0 30 11 *', false);

export const startPayPeriodCronJob = payPeriodJob.start;
export const stopPayPeriodCronJob = payPeriodJob.stop;
