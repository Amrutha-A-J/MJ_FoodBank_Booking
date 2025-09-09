import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Replace existing 'other' access entries with 'donor_management'
  pgm.sql("UPDATE staff SET access = array_replace(access, 'other', 'donor_management') WHERE access @> ARRAY['other']::text[]");
  pgm.dropConstraint('staff', 'staff_access_check');
  pgm.addConstraint('staff', 'staff_access_check', {
    check: "access <@ ARRAY['pantry','volunteer_management','warehouse','admin','donor_management','payroll_management']",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("UPDATE staff SET access = array_replace(access, 'donor_management', 'other') WHERE access @> ARRAY['donor_management']::text[]");
  pgm.dropConstraint('staff', 'staff_access_check');
  pgm.addConstraint('staff', 'staff_access_check', {
    check: "access <@ ARRAY['pantry','volunteer_management','warehouse','admin','other','payroll_management']",
  });
}
