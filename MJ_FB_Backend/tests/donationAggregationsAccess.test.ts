import request from 'supertest';
import express from 'express';
import donationsRoutes from '../src/routes/warehouse/donations';

const app = express();
app.use('/donations', donationsRoutes);

describe('donation aggregations auth', () => {
  it('requires auth for aggregations', async () => {
    const res = await request(app).get('/donations/aggregations?year=2024');
    expect(res.status).toBe(401);
  });

  it('requires auth for export', async () => {
    const res = await request(app).get('/donations/aggregations/export?year=2024');
    expect(res.status).toBe(401);
  });
});
