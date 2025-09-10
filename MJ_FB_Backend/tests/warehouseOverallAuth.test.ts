import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);

describe('warehouse overall auth', () => {
  it('requires auth for list', async () => {
    const res = await request(app).get('/warehouse-overall');
    expect(res.status).toBe(401);
  });

  it('requires auth for export', async () => {
    const res = await request(app).get('/warehouse-overall/export?year=2024');
    expect(res.status).toBe(401);
  });

  it('requires auth for years', async () => {
    const res = await request(app).get('/warehouse-overall/years');
    expect(res.status).toBe(401);
  });
});
