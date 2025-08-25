import request from 'supertest';
import express from 'express';
import donorsRoutes from '../src/routes/donors';
import outgoingReceiversRoutes from '../src/routes/warehouse/outgoingReceivers';
import pool from '../src/db';

jest.mock('../src/db');

const app = express();
app.use('/donors', donorsRoutes);
app.use('/outgoing-receivers', outgoingReceiversRoutes);

beforeEach(() => {
  (pool.query as jest.Mock).mockReset();
});

describe('GET /donors/top', () => {
  it('returns top donors for the year', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ name: 'Alice', totalLbs: 100, lastDonationISO: '2024-01-10' }],
    });

    const res = await request(app).get('/donors/top?year=2024&limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { name: 'Alice', totalLbs: 100, lastDonationISO: '2024-01-10' },
    ]);
  });
});

describe('GET /outgoing-receivers/top', () => {
  it('returns top receivers for the year', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ name: 'Org', totalLbs: 50, lastPickupISO: '2024-02-15' }],
    });

    const res = await request(app).get('/outgoing-receivers/top?year=2024&limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { name: 'Org', totalLbs: 50, lastPickupISO: '2024-02-15' },
    ]);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/ORDER BY "totalLbs" DESC/);
  });
});
