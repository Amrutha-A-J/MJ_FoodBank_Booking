import type { MigrationBuilder } from 'node-pg-migrate';

const DONORS_COLUMN = 'is_pet_food';
const WAREHOUSE_COLUMN = 'pet_food';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('donors', {
    [DONORS_COLUMN]: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  });

  pgm.addColumn('warehouse_overall', {
    [WAREHOUSE_COLUMN]: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
  });

  pgm.sql(`
    WITH monthly_totals AS (
      SELECT
        w.year,
        w.month,
        COALESCE(SUM(COALESCE(d.weight, 0))::int, 0) AS total_weight,
        COALESCE(
          SUM(
            CASE
              WHEN COALESCE(o.${DONORS_COLUMN}, FALSE) THEN COALESCE(d.weight, 0)
              ELSE 0
            END
          )::int,
          0
        ) AS pet_food_weight
      FROM warehouse_overall w
      LEFT JOIN donations d
        ON EXTRACT(YEAR FROM d.date)::int = w.year
       AND EXTRACT(MONTH FROM d.date)::int = w.month
      LEFT JOIN donors o ON d.donor_id = o.id
      GROUP BY w.year, w.month
    )
    UPDATE warehouse_overall w
       SET donations = COALESCE(mt.total_weight, 0) - COALESCE(mt.pet_food_weight, 0),
           ${WAREHOUSE_COLUMN} = COALESCE(mt.pet_food_weight, 0)
      FROM monthly_totals mt
     WHERE w.year = mt.year
       AND w.month = mt.month;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('warehouse_overall', WAREHOUSE_COLUMN, { ifExists: true });
  pgm.dropColumn('donors', DONORS_COLUMN, { ifExists: true });
}
