import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterTable('staff', {
    dropConstraint: 'staff_access_check',
  });
  pgm.addConstraint('staff', 'staff_access_check', {
    check: "access <@ ARRAY['pantry','volunteer_management','warehouse','admin','other','payroll_management']",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterTable('staff', {
    dropConstraint: 'staff_access_check',
  });
  pgm.addConstraint('staff', 'staff_access_check', {
    check: "access <@ ARRAY['pantry','volunteer_management','warehouse','admin']",
  });
}
