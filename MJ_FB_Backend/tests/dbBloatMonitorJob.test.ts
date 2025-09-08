jest.mock('node-cron', () => ({ schedule: jest.fn() }), { virtual: true });
jest.mock('../src/utils/scheduleDailyJob', () => {
  const actual = jest.requireActual('../src/utils/scheduleDailyJob');
  return {
    __esModule: true,
    default: (cb: any, schedule: string) => actual.default(cb, schedule, false, false),
  };
});
jest.mock('../src/utils/opsAlert');
const job = require('../src/utils/dbBloatMonitorJob');
const {
  checkDbBloat,
} = job;
import pool from '../src/db';
import config from '../src/config';
import { notifyOps, alertOps } from '../src/utils/opsAlert';

describe('checkDbBloat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies ops when dead rows exceed threshold', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ relname: 'foo', n_dead_tup: '6000' }],
    });
    await checkDbBloat();
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT relname, n_dead_tup FROM pg_stat_user_tables WHERE n_dead_tup > $1 ORDER BY n_dead_tup DESC',
      [config.vacuumAlertDeadRowsThreshold],
    );
    expect(notifyOps).toHaveBeenCalledWith(
      expect.stringContaining('Database tables require vacuum'),
    );
    const message = (notifyOps as jest.Mock).mock.calls[0][0] as string;
    expect(message).toContain('foo (6000 dead rows)');
  });

  it('skips notification when no tables exceed threshold', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await checkDbBloat();
    expect(notifyOps).not.toHaveBeenCalled();
  });

  it('alerts ops on failure', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await checkDbBloat();
    expect(alertOps).toHaveBeenCalled();
  });
});
