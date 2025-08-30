import request from 'supertest';
import express from 'express';
import newClientsRouter from '../src/routes/newClients';
import * as model from '../src/models/newClient';

jest.mock('../src/models/newClient', () => ({
  fetchNewClients: jest.fn(),
  deleteNewClient: jest.fn(),
}));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'staff' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/new-clients', newClientsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('new clients routes', () => {
  it('lists new clients', async () => {
    (model.fetchNewClients as jest.Mock).mockResolvedValue([{ id: 1, name: 'A' }]);
    const res = await request(app).get('/new-clients');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'A' }]);
  });

  it('validates id on delete', async () => {
    const res = await request(app).delete('/new-clients/abc');
    expect(res.status).toBe(400);
    expect(model.deleteNewClient).not.toHaveBeenCalled();
  });

  it('deletes new client', async () => {
    const res = await request(app).delete('/new-clients/1');
    expect(res.status).toBe(204);
    expect(model.deleteNewClient).toHaveBeenCalledWith(1);
  });
});
