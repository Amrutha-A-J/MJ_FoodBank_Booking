import request from 'supertest';
import express from 'express';
import donorsRoutes from '../src/routes/donors';
import outgoingReceiversRoutes from '../src/routes/warehouse/outgoingReceivers';
import pool from '../src/db';


const app = express();
app.use('/donors', donorsRoutes);
app.use('/outgoing-receivers', outgoingReceiversRoutes);
const year = new Date().getFullYear();
const startOfYear = new Date(Date.UTC(year, 0, 1)).toISOString().slice(0, 10);
const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString().slice(0, 10);

beforeEach(() => {
  (pool.query as jest.Mock).mockReset();
});

describe('GET /donors/top', () => {
  it('returns top donors for the year', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ name: 'Alice', totalLbs: 100, lastDonationISO: `${year}-01-10` }],
    });

    const res = await request(app).get(`/donors/top?year=${year}&limit=5`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { name: 'Alice', totalLbs: 100, lastDonationISO: `${year}-01-10` },
    ]);
    expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual([startOfYear, startOfNextYear, 5]);
  });

  it('clamps limit to 100', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/donors/top?year=${year}&limit=150`);
    expect(res.status).toBe(200);
    expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual([startOfYear, startOfNextYear, 100]);
  });

  it('returns 400 for non-numeric limit', async () => {
    const res = await request(app).get(`/donors/top?year=${year}&limit=abc`);
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 400 for limit less than 1', async () => {
    const res = await request(app).get(`/donors/top?year=${year}&limit=0`);
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('GET /outgoing-receivers/top', () => {
  it('returns top receivers for the year', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ name: 'Org', totalLbs: 50, lastPickupISO: `${year}-02-15` }],
    });

    const res = await request(app).get(`/outgoing-receivers/top?year=${year}&limit=5`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { name: 'Org', totalLbs: 50, lastPickupISO: `${year}-02-15` },
    ]);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/ORDER BY "totalLbs" DESC/);
    expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual([startOfYear, startOfNextYear, 5]);
  });
});
