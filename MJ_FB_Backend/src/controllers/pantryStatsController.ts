import pool from '../db';

export async function refreshPantryWeekly(year: number, month: number, week: number) {
  await pool.query('SELECT refresh_pantry_weekly($1,$2,$3)', [year, month, week]);
}

export async function refreshPantryMonthly(year: number, month: number) {
  await pool.query('SELECT refresh_pantry_monthly($1,$2)', [year, month]);
}

export async function refreshPantryYearly(year: number) {
  await pool.query('SELECT refresh_pantry_yearly($1)', [year]);
}
