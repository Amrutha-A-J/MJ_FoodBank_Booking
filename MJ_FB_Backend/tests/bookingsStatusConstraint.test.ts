import MigrationBuilder from 'node-pg-migrate/dist/migrationBuilder';
import { up } from '../migrations/20241120120000_add_no_show_to_bookings';

describe('bookings status constraint migration', () => {
  it('includes no_show in allowed statuses', async () => {
    const pgm = new (MigrationBuilder as any)({ log: () => {} });
    await up(pgm);
    const sql = pgm.getSql();
    expect(sql).toContain("status IN ('approved','rejected','cancelled','no_show','expired','visited')");
  });
});
