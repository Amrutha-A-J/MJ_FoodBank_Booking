import request from 'supertest';
import express from 'express';
import agenciesRoutes from '../src/routes/agencies';
import { getAgencyForClient, addAgencyClient } from '../src/models/agency';

jest.mock('../src/models/agency', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/agency'),
  getAgencyForClient: jest.fn(),
  addAgencyClient: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: '1', role: 'staff' };
    next();
  },
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use(express.json());
app.use('/agencies', agenciesRoutes);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message, agencyName: err.agencyName });
});

describe('POST /agencies/:id/clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when client already associated with another agency', async () => {
    (getAgencyForClient as jest.Mock).mockResolvedValue({ id: 2, name: 'Existing Agency' });

    const res = await request(app)
      .post('/agencies/1/clients')
      .send({ clientId: 5 });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      message: 'Client already associated with Existing Agency',
      agencyName: 'Existing Agency',
    });
    expect(addAgencyClient).not.toHaveBeenCalled();
  });
});
