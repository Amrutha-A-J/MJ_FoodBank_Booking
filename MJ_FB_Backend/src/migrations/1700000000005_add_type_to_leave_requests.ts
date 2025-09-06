import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('leave_requests', {
    type: { type: 'varchar(20)', notNull: true, default: 'vacation' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('leave_requests', 'type');
}
