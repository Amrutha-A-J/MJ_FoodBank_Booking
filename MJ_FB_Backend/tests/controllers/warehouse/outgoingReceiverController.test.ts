import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import mockDb from '../../utils/mockDb';
import {
  listOutgoingReceivers,
  addOutgoingReceiver,
  deleteOutgoingReceiver,
} from '../../../src/controllers/warehouse/outgoingReceiverController';
import outgoingReceiversRoutes from '../../../src/routes/warehouse/outgoingReceivers';

const flushPromises = () => new Promise(process.nextTick);

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  send: jest.fn(),
});

const authMiddlewareMock = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);
const authorizeAccessHandlerMock = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);

jest.mock('../../../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: Request, res: Response, next: NextFunction) =>
    authMiddlewareMock(req, res, next),
  authorizeAccess: (..._access: string[]) =>
    (req: Request, res: Response, next: NextFunction) =>
      authorizeAccessHandlerMock(req, res, next),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/outgoing-receivers', outgoingReceiversRoutes);
  return app;
};

beforeEach(() => {
  (mockDb.query as jest.Mock).mockReset();
  (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  authMiddlewareMock.mockReset();
  authMiddlewareMock.mockImplementation((_req, _res, next) => next());
  authorizeAccessHandlerMock.mockReset();
  authorizeAccessHandlerMock.mockImplementation((_req, _res, next) => next());
});

describe('outgoingReceiverController', () => {
  it('lists outgoing receivers', async () => {
    const rows = [
      { id: 1, name: 'Community Fridge' },
      { id: 2, name: 'Shelter' },
    ];
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows, rowCount: rows.length });

    const res = { json: jest.fn() } as any;

    await listOutgoingReceivers({} as any, res, jest.fn());
    await flushPromises();

    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT id, name FROM outgoing_receivers ORDER BY name',
    );
    expect(res.json).toHaveBeenCalledWith(rows);
  });

  it('creates a new receiver', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 5, name: 'Food Share' }],
      rowCount: 1,
    });

    const req = { body: { name: 'Food Share' } } as any;
    const res = createResponse();

    await addOutgoingReceiver(req, res as any, jest.fn());
    await flushPromises();

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO outgoing_receivers'),
      ['Food Share'],
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 5, name: 'Food Share' });
  });

  it('returns 409 when the receiver already exists', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce({ code: '23505' });

    const req = { body: { name: 'Duplicate Org' } } as any;
    const res = createResponse();

    await addOutgoingReceiver(req, res as any, jest.fn());
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Receiver already exists' });
  });

  it('forwards unexpected errors when creating receivers', async () => {
    const error = new Error('db failure');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);

    const req = { body: { name: 'Error Org' } } as any;
    const res = createResponse();
    const next = jest.fn();

    await addOutgoingReceiver(req, res as any, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });

  describe('deleteOutgoingReceiver', () => {
    it('validates the receiver id', async () => {
      const res = createResponse();

      await deleteOutgoingReceiver({ params: { id: 'abc' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid receiver id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('deletes an existing receiver', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const res = createResponse();

      await deleteOutgoingReceiver({ params: { id: '3' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM outgoing_receivers WHERE id = $1',
        [3],
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });

    it('returns 404 when the receiver is missing', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const res = createResponse();

      await deleteOutgoingReceiver({ params: { id: '4' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Receiver not found' });
    });

    it('returns 409 when the receiver has logged donations', async () => {
      (mockDb.query as jest.Mock).mockRejectedValueOnce({ code: '23503' });

      const res = createResponse();

      await deleteOutgoingReceiver({ params: { id: '7' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Receiver has logged donations' });
    });

    it('forwards unexpected errors when deleting receivers', async () => {
      const error = new Error('db error');
      (mockDb.query as jest.Mock).mockRejectedValueOnce(error);

      const res = createResponse();
      const next = jest.fn();

      await deleteOutgoingReceiver({ params: { id: '8' } } as any, res as any, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

describe('outgoing receiver routes', () => {
  it('requires authentication for listing receivers', async () => {
    authMiddlewareMock.mockImplementationOnce((_req, res: Response) =>
      res.status(401).json({ message: 'Missing token' }),
    );

    const app = createApp();
    const res = await request(app).get('/outgoing-receivers');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Missing token' });
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('returns validation errors when creating with an empty name', async () => {
    const app = createApp();
    const res = await request(app).post('/outgoing-receivers').send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
    );
    expect(mockDb.query).not.toHaveBeenCalled();
  });
});

export {};
