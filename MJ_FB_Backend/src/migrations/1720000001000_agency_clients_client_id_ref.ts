import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('agency_clients', 'agency_clients_client_id_fkey');
  pgm.alterColumn('agency_clients', 'client_id', { type: 'bigint' });
  pgm.addConstraint('agency_clients', 'agency_clients_client_id_fkey', {
    foreignKeys: {
      columns: 'client_id',
      references: 'clients(client_id)',
      onDelete: 'CASCADE',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('agency_clients', 'agency_clients_client_id_fkey');
  pgm.alterColumn('agency_clients', 'client_id', { type: 'integer' });
  pgm.addConstraint('agency_clients', 'agency_clients_client_id_fkey', {
    foreignKeys: {
      columns: 'client_id',
      references: 'clients(id)',
      onDelete: 'CASCADE',
    },
  });
}
