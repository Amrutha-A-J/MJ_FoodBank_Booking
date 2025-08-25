import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('volunteer_recurring_bookings', {
    id: 'id',
    volunteer_id: {
      type: 'integer',
      notNull: true,
      references: 'volunteers',
      onDelete: 'CASCADE',
    },
    slot_id: {
      type: 'integer',
      notNull: true,
      references: 'volunteer_slots',
      onDelete: 'CASCADE',
    },
    start_date: { type: 'date', notNull: true },
    end_date: { type: 'date' },
    pattern: {
      type: 'text',
      notNull: true,
      check: "pattern IN ('daily','weekly')",
    },
    days_of_week: {
      type: 'integer[]',
      notNull: true,
      default: pgm.func("ARRAY[]::integer[]"),
    },
    active: { type: 'boolean', notNull: true, default: true },
  });

  pgm.addColumn('volunteer_bookings', {
    recurring_id: {
      type: 'integer',
      references: 'volunteer_recurring_bookings',
      onDelete: 'SET NULL',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('volunteer_bookings', 'recurring_id');
  pgm.dropTable('volunteer_recurring_bookings');
}
