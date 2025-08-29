import request from 'supertest';
import express from 'express';
import agenciesRoutes from '../src/routes/agencies';
import { getAgencyClients } from '../src/models/agency';

jest.mock('../src/models/agency', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/agency'),
  getAgencyClients: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: '1', role: 'agency' };
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
  res.status(err.status || 500).json({ message: err.message });
});

describe('GET /agencies/me/clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns clients for authenticated agency', async () => {
    (getAgencyClients as jest.Mock).mockResolvedValue([
      { client_id: 5, first_name: 'John', last_name: 'Doe', email: null },
    ]);

    const res = await request(app).get('/agencies/me/clients');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { client_id: 5, first_name: 'John', last_name: 'Doe', email: null },
    ]);
    expect(getAgencyClients).toHaveBeenCalledWith(1);
  });
});
