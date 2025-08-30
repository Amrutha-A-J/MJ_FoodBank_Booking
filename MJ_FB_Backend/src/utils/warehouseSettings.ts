import pool from '../db';

export interface WarehouseSettings {
  breadWeightMultiplier: number;
  cansWeightMultiplier: number;
}

let cache: WarehouseSettings | null = null;

export async function getWarehouseSettings(): Promise<WarehouseSettings> {
  if (cache) return cache;
  const res = await pool.query(
    'SELECT key, value FROM app_config WHERE key IN ($1,$2)',
    ['bread_weight_multiplier', 'cans_weight_multiplier'],
  );
  const settings: WarehouseSettings = {
    breadWeightMultiplier: 10,
    cansWeightMultiplier: 20,
  };
  for (const row of res.rows) {
    if (row.key === 'bread_weight_multiplier') {
      settings.breadWeightMultiplier = Number(row.value);
    } else if (row.key === 'cans_weight_multiplier') {
      settings.cansWeightMultiplier = Number(row.value);
    }
  }
  cache = settings;
  return settings;
}

export async function updateWarehouseSettings(settings: WarehouseSettings): Promise<void> {
  const entries = [
    ['bread_weight_multiplier', settings.breadWeightMultiplier],
    ['cans_weight_multiplier', settings.cansWeightMultiplier],
  ];
  const values: any[] = [];
  const placeholders = entries
    .map(([k, v], i) => {
      values.push(k, String(v));
      return `($${i * 2 + 1}, $${i * 2 + 2})`;
    })
    .join(',');
  await pool.query(
    `INSERT INTO app_config (key, value) VALUES ${placeholders} ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    values,
  );
  cache = { ...settings };
}

export function clearWarehouseSettingsCache() {
  cache = null;
}
