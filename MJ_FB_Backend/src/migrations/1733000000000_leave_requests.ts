import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("leave_requests", {
    id: "id",
    staff_id: {
      type: "integer",
      notNull: true,
      references: "staff",
      onDelete: "CASCADE",
    },
    start_date: { type: "date", notNull: true },
    end_date: { type: "date", notNull: true },
    status: { type: "varchar(20)", notNull: true, default: "pending" },
    reason: { type: "text" },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("leave_requests");
}
