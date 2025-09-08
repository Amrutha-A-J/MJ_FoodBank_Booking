import request from 'supertest';
import express from 'express';
import clientVisitsRouter from '../src/routes/clientVisits';
import pool from '../src/db';
import readXlsxFile, { readSheetNames } from 'read-excel-file/node';

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
app.use('/visits', clientVisitsRouter);

describe('client visit xlsx import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates duplicate visits by default', async () => {
      const mockRead = readXlsxFile as jest.Mock;
      const mockSheets = readSheetNames as jest.Mock;
      mockSheets.mockResolvedValueOnce(['2024-05-01']);
    mockRead.mockResolvedValueOnce([
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['1A', 30, 20, 0, 123],
    ]);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 }) // select visit
      .mockResolvedValueOnce({}) // UPDATE visit
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/visits/import/xlsx').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE client_visits'),
      expect.any(Array),
    );
  });

    it('uses sheet name as visit date', async () => {
      const mockRead = readXlsxFile as jest.Mock;
      const mockSheets = readSheetNames as jest.Mock;
      mockSheets.mockResolvedValueOnce(['2024-05-01']);
    mockRead.mockResolvedValueOnce([
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['1A', 30, null, 0, 123],
    ]);
    const buffer = Buffer.from('xlsx');
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ value: 5 }], rowCount: 1 });
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({ rowCount: 0 }) // select visit
      .mockResolvedValueOnce({}) // INSERT visit
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/visits/import/xlsx').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-05-01', 123, 30, 25, 0, 1, 0],
    );
  });

  it('returns validation summary on dry run', async () => {
      const mockRead = readXlsxFile as jest.Mock;
      const mockSheets = readSheetNames as jest.Mock;
      mockSheets.mockResolvedValueOnce(['2024-05-01', '2024-05-02']);
    mockRead
      .mockResolvedValueOnce([
        ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
        ['1A', 30, 20, 0, 123],
      ])
      .mockResolvedValueOnce([
        ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
        ['bad', 30, 20, 0, 123],
      ]);

    const buffer = Buffer.from('xlsx');
    const res = await request(app)
      .post('/client-visits/import/xlsx?dryRun=true')
      .attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { date: '2024-05-01', rowCount: 1, errors: [] },
      { date: '2024-05-02', rowCount: 1, errors: [expect.any(String)] },
    ]);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('returns error for invalid sheet name', async () => {
    const sheets = ['Sheet1'];
    (readSheetNames as jest.Mock).mockResolvedValueOnce(sheets);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // cart tare
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/client-visits/import').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 0, newClients: [], errors: { Sheet1: ['Invalid sheet name'] } });
    expect(queryMock).toHaveBeenCalledTimes(3);
  });

  it('aggregates errors per sheet', async () => {
    const sheets = ['2024-05-01', '2024-05-02'];
    const sheet1Rows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['1A', 30, null, 0, 123],
    ];
    const sheet2Rows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['1A', 'bad', 20, 0, 456],
    ];
    (readSheetNames as jest.Mock).mockResolvedValueOnce(sheets);
    (readXlsxFile as jest.Mock)
      .mockResolvedValueOnce(sheet1Rows)
      .mockResolvedValueOnce(sheet2Rows);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ value: 5 }], rowCount: 1 }) // cart tare
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}) // insert visit
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/client-visits/import').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.errors['2024-05-02'][0]).toMatch('Row 2');
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-05-01', 123, 30, 25, 0, 1, 0],
    );
  });

  it('imports sunshine bag row into log', async () => {
    const sheets = ['2024-05-01'];
    const rows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['3A', null, 24, null, 'SUNSHINE'],
    ];
    (readSheetNames as jest.Mock).mockResolvedValueOnce(sheets);
    (readXlsxFile as jest.Mock).mockResolvedValueOnce(rows);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ value: 0 }], rowCount: 1 }) // cart tare
      .mockResolvedValueOnce({}) // insert sunshine bag
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/client-visits/import').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('sunshine_bag_log'),
      ['2024-05-01', 24, 3],
    );
  });
});
