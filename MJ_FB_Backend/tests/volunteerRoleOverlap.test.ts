import request from 'supertest';
import express from 'express';
import volunteerRolesRouter from '../src/routes/volunteer/volunteerRoles';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-roles', volunteerRolesRouter);

describe('Volunteer role overlap', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects overlapping slots', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, category_id: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ slot_id: 2, start_time: '10:00:00', end_time: '12:00:00' }] });
    const res = await request(app).post('/volunteer-roles').send({
      name: 'Role',
      startTime: '09:00:00',
      endTime: '11:00:00',
      maxVolunteers: 1,
      categoryId: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/overlap/i);
  });
});
