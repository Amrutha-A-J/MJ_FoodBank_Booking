import request from 'supertest';
import express from 'express';
import clientVisitsRouter from '../src/routes/clientVisits';
import pool from '../src/db';
import readXlsxFile from 'read-excel-file/node';

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

describe('client visit xlsx import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports visits for existing clients', async () => {
    const sheets = [{ name: '2024-05-01' }];
    const sheetRows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['2A1C', 30, 20, 1, 123],
    ];
    (readXlsxFile as jest.Mock)
      .mockResolvedValueOnce(sheets)
      .mockResolvedValueOnce(sheetRows);

  it('skips duplicate visits when strategy is skip', async () => {
    const mockRead = readXlsxFile as jest.Mock;
    mockRead.mockImplementation((_buf, options) => {
      if (options?.getSheets) return Promise.resolve([{ name: '2024-05-01' }]);
      if (options?.sheet === '2024-05-01') {
        return Promise.resolve([
          ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
          ['1A', 30, 20, 0, 123],
        ]);
      }
      return Promise.resolve([]);
    });
    const buffer = Buffer.from('xlsx');
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 }) // select visit
      .mockResolvedValueOnce({}); // COMMIT
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app)
      .post('/client-visits/import/xlsx?duplicateStrategy=skip')
      .attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 1, newClients: [], errors: {} });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-05-01', 123, 30, 20, 1, 2, 1],
    );
  });

  it('creates missing clients on import', async () => {
    const sheets = [{ name: '2024-05-01' }];
    const sheetRows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['1A', 30, 20, 0, 555],
    ];
    (readXlsxFile as jest.Mock)
      .mockResolvedValueOnce(sheets)
      .mockResolvedValueOnce(sheetRows);

    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      expect.anything(),
    );
    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE client_visits'),
      expect.anything(),
    );
  });

  it('updates duplicate visits when strategy is update', async () => {
    const mockRead = readXlsxFile as jest.Mock;
    mockRead.mockImplementation((_buf, options) => {
      if (options?.getSheets) return Promise.resolve([{ name: '2024-05-01' }]);
      if (options?.sheet === '2024-05-01') {
        return Promise.resolve([
          ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
          ['1A', 30, 20, 0, 123],
        ]);
      }
      return Promise.resolve([]);
    });
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

    const res = await request(app)
      .post('/client-visits/import/xlsx?duplicateStrategy=update')
      .attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 1, newClients: [555], errors: {} });
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO clients'),
      [555, 'https://portal.link2feed.ca/org/1605/intake/555'],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-05-01', 555, 30, 20, 0, 1, 0],
    );
  });

  it('deletes uploaded file after import', async () => {
    const sheets = [{ name: '2024-05-01' }];
    const sheetRows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['2A1C', 30, 20, 1, 123],
    ];
    (readXlsxFile as jest.Mock)
      .mockResolvedValueOnce(sheets)
      .mockResolvedValueOnce(sheetRows);
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
    expect(res.json).toHaveBeenCalledWith({ imported: 1, newClients: [], errors: {} });
    
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE client_visits'),
      expect.arrayContaining([30, 20, 0, 1, 0, 5]),
    );
  });

  it('returns validation summary on dry run', async () => {
    const mockRead = readXlsxFile as jest.Mock;
    mockRead.mockImplementation((_buf, options) => {
      if (options?.getSheets) {
        return Promise.resolve([{ name: '2024-05-01' }, { name: '2024-05-02' }]);
      }
      if (options?.sheet === '2024-05-01') {
        return Promise.resolve([
          ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
          ['1A', 30, 20, 0, 123],
        ]);
      }
      if (options?.sheet === '2024-05-02') {
        return Promise.resolve([
          ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
          ['bad', 30, 20, 0, 123],
        ]);
      }
      return Promise.resolve([]);
    });

    const buffer = Buffer.from('xlsx');
    const res = await request(app)
      .post('/client-visits/import/xlsx?duplicateStrategy=skip&dryRun=true')
      .attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { date: '2024-05-01', rowCount: 1, errors: [] },
      { date: '2024-05-02', rowCount: 1, errors: [expect.any(String)] },
    ]);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('returns error for invalid sheet name', async () => {
    const sheets = [{ name: 'Sheet1' }];
    (readXlsxFile as jest.Mock).mockResolvedValueOnce(sheets);
    const buffer = Buffer.from('xlsx');
    const queryMock = jest.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({});
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app).post('/client-visits/import').attach('file', buffer, 'visits.xlsx');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 0, newClients: [], errors: { Sheet1: ['Invalid sheet name'] } });
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('aggregates errors per sheet', async () => {
    const sheets = [{ name: '2024-05-01' }, { name: '2024-05-02' }];
    const sheet1Rows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['1A', 30, 20, 0, 123],
    ];
    const sheet2Rows = [
      ['family size', 'weight with cart', 'weight without cart', 'pet item', 'client id'],
      ['1A', 'bad', 20, 0, 456],
    ];
    (readXlsxFile as jest.Mock)
      .mockResolvedValueOnce(sheets)
      .mockResolvedValueOnce(sheet1Rows)
      .mockResolvedValueOnce(sheet2Rows);
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
    expect(res.body.imported).toBe(1);
    expect(res.body.errors['2024-05-02'][0]).toMatch('Row 2');
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-05-01', 123, 30, 20, 0, 1, 0],
    );
  });
});
