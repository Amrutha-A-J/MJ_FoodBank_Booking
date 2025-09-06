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
});

