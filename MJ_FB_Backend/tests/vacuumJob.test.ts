jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
jest.mock('../src/utils/opsAlert');
const job = require('../src/utils/vacuumJob');
const { runVacuum } = job;
import pool from '../src/db';
import { alertOps } from '../src/utils/opsAlert';

describe('runVacuum', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs VACUUM ANALYZE on tables', async () => {
    (pool.query as jest.Mock).mockResolvedValue({});
    await runVacuum();
    expect(pool.query).toHaveBeenNthCalledWith(1, 'VACUUM (ANALYZE) bookings');
    expect(pool.query).toHaveBeenNthCalledWith(2, 'VACUUM (ANALYZE) volunteer_bookings');
    expect(pool.query).toHaveBeenNthCalledWith(3, 'VACUUM (ANALYZE) email_queue');
  });

  it('alerts ops when a vacuum fails', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue({});
    await runVacuum();
    expect(alertOps).toHaveBeenCalledWith('vacuumJob:volunteer_bookings', expect.any(Error));
  });
});

