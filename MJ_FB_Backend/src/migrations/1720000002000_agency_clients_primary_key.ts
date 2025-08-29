import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('agency_clients', 'agency_clients_agency_id_client_id_key', { ifExists: true });
  pgm.addConstraint('agency_clients', 'agency_clients_pkey', {
    primaryKey: ['agency_id', 'client_id'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('agency_clients', 'agency_clients_pkey', { ifExists: true });
  pgm.addConstraint('agency_clients', 'agency_clients_agency_id_client_id_key', {
    unique: ['agency_id', 'client_id'],
  });
}
