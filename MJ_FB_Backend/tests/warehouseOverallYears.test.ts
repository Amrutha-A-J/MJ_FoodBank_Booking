import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';

jest.mock('../src/db');

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);

describe('GET /warehouse-overall/years', () => {
  it('lists available years in descending order', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ year: 2024 }, { year: 2023 }],
    });

    const res = await request(app).get('/warehouse-overall/years');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([2024, 2023]);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT DISTINCT year FROM warehouse_overall ORDER BY year DESC',
    );
  });
});
