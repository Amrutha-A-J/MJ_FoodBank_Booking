import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE email_queue ADD COLUMN template_id integer NOT NULL DEFAULT 0;`);
  pgm.sql(`ALTER TABLE email_queue ADD COLUMN params jsonb NOT NULL DEFAULT '{}'::jsonb;`);
  pgm.sql(`ALTER TABLE email_queue DROP COLUMN subject;`);
  pgm.sql(`ALTER TABLE email_queue DROP COLUMN body;`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE email_queue ADD COLUMN subject text NOT NULL DEFAULT '';`);
  pgm.sql(`ALTER TABLE email_queue ADD COLUMN body text NOT NULL DEFAULT '';`);
  pgm.sql(`ALTER TABLE email_queue DROP COLUMN template_id;`);
  pgm.sql(`ALTER TABLE email_queue DROP COLUMN params;`);
}
