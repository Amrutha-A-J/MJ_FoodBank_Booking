import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);

describe('GET /warehouse-overall/years', () => {
  it('returns 404 now that the years endpoint is removed', async () => {
    const res = await request(app).get('/warehouse-overall/years');

    expect(res.status).toBe(404);
  });
});
