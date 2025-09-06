import request from 'supertest';
import express from 'express';
import clientVisitsRouter from '../src/routes/clientVisits';
import pool from '../src/db';
import readXlsxFile from 'read-excel-file/node';
import { bulkImportVisits } from '../src/controllers/clientVisitController';
import fs from 'fs/promises';

jest.mock('read-excel-file/node');

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => {
    (_req as any).user = { id: 1, role: 'staff', access: ['pantry'] };
    next();
  },
  authorizeAccess: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/client-visits', clientVisitsRouter);

describe('bulk client visit import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports visits for existing clients', async () => {
    const rows = [
      ['date', 'family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      [new Date('2024-05-01'), '2A1C', 30, 20, 1, 123],
    ];
    (readXlsxFile as jest.Mock).mockResolvedValueOnce(rows);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}) // insert visit
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/client-visits/import').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 1, newClients: [] });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-04-30', 123, 30, 20, 1, 2, 1],
    );
  });

  it('creates missing clients on import', async () => {
    const rows = [
      ['date', 'family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      [new Date('2024-05-01'), '1A', 30, 20, 0, 555],
    ];
    (readXlsxFile as jest.Mock).mockResolvedValueOnce(rows);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // select client
      .mockResolvedValueOnce({}) // insert client
      .mockResolvedValueOnce({}) // insert visit
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/client-visits/import').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 1, newClients: [555] });
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO clients'),
      [555, 'https://portal.link2feed.ca/org/1605/intake/555'],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-04-30', 555, 30, 20, 0, 1, 0],
    );
  });

  it('deletes uploaded file after import', async () => {
    const rows = [
      ['date', 'family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      [new Date('2024-05-01'), '2A1C', 30, 20, 1, 123],
    ];
    (readXlsxFile as jest.Mock).mockResolvedValueOnce(rows);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}) // insert visit
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const unlinkMock = jest.spyOn(fs, 'unlink').mockResolvedValueOnce();

    const req: any = { file: { buffer, path: '/tmp/upload.xlsx' } };
    const res: any = { json: jest.fn(), status: jest.fn(() => res) };
    const next = jest.fn();

    await bulkImportVisits(req, res, next);

    expect(unlinkMock).toHaveBeenCalledWith('/tmp/upload.xlsx');
    expect(res.json).toHaveBeenCalledWith({ imported: 1, newClients: [] });

    unlinkMock.mockRestore();
  });
});

