import request from 'supertest';
import express from 'express';
import donationsRoutes from '../src/routes/warehouse/donations';

const app = express();
app.use('/donations', donationsRoutes);
const year = new Date().getFullYear();

describe('donation aggregations auth', () => {
  it('requires auth for aggregations', async () => {
    const res = await request(app).get(`/donations/aggregations?year=${year}`);
    expect(res.status).toBe(401);
  });

  it('requires auth for export', async () => {
    const res = await request(app).get(`/donations/aggregations/export?year=${year}`);
    expect(res.status).toBe(401);
  });

  it('requires auth for manual insert', async () => {
    const res = await request(app).post('/donations/aggregations/manual');
    expect(res.status).toBe(401);
  });
});
