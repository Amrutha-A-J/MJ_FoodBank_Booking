import pool from '../db';

export async function refreshPantryWeekly(year: number, week: number) {
  await pool.query('SELECT refresh_pantry_weekly($1,$2)', [year, week]);
}

export async function refreshPantryMonthly(year: number, month: number) {
  await pool.query('SELECT refresh_pantry_monthly($1,$2)', [year, month]);
}

export async function refreshPantryYearly(year: number) {
  await pool.query('SELECT refresh_pantry_yearly($1)', [year]);
}
