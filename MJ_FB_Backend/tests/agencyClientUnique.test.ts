import request from 'supertest';
import express from 'express';
import agenciesRoutes from '../src/routes/agencies';
import { getAgencyForClient, addAgencyClient, clientExists } from '../src/models/agency';

jest.mock('../src/models/agency', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/agency'),
  getAgencyForClient: jest.fn(),
  addAgencyClient: jest.fn(),
  clientExists: jest.fn(),
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

describe('POST /agencies/add-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when client already associated with another agency', async () => {
    (clientExists as jest.Mock).mockResolvedValue(true);
    (getAgencyForClient as jest.Mock).mockResolvedValue({ id: 2, name: 'Existing Agency' });

    const res = await request(app)
      .post('/agencies/add-client')
      .send({ agencyId: 1, clientId: 5 });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      message: 'Client already associated with Existing Agency',
      agencyName: 'Existing Agency',
    });
    expect(addAgencyClient).not.toHaveBeenCalled();
  });

  it('returns 404 when client does not exist', async () => {
    (clientExists as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/agencies/add-client')
      .send({ agencyId: 1, clientId: 999 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Client not found' });
    expect(getAgencyForClient).not.toHaveBeenCalled();
    expect(addAgencyClient).not.toHaveBeenCalled();
  });
});
