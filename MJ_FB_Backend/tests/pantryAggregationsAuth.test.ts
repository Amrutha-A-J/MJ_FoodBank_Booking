import request from 'supertest';
import express from 'express';
import pantryAggregationsRoutes from '../src/routes/pantry/aggregations';

const app = express();
app.use('/pantry-aggregations', pantryAggregationsRoutes);

describe('pantry aggregations auth', () => {
  it('requires auth for weekly aggregations', async () => {
    const res = await request(app).get('/pantry-aggregations/weekly');
    expect(res.status).toBe(401);
  });

  it('requires auth for available months', async () => {
    const res = await request(app).get('/pantry-aggregations/months');
    expect(res.status).toBe(401);
  });

  it('requires auth for available weeks', async () => {
    const res = await request(app).get('/pantry-aggregations/weeks');
    expect(res.status).toBe(401);
  });

  it('requires auth for export', async () => {
    const res = await request(app).get('/pantry-aggregations/export');
    expect(res.status).toBe(401);
  });
});
