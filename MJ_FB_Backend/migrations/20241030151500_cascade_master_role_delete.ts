import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('volunteer_roles', 'volunteer_roles_category_id_fkey');
  pgm.addConstraint('volunteer_roles', 'volunteer_roles_category_id_fkey', {
    foreignKeys: {
      columns: 'category_id',
      references: 'volunteer_master_roles(id)',
      onDelete: 'CASCADE',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('volunteer_roles', 'volunteer_roles_category_id_fkey');
  pgm.addConstraint('volunteer_roles', 'volunteer_roles_category_id_fkey', {
    foreignKeys: {
      columns: 'category_id',
      references: 'volunteer_master_roles(id)',
    },
  });
}

