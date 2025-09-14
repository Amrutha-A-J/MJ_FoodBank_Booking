import request from 'supertest';
import express from 'express';
import badgesRouter from '../src/routes/badges';
import { awardMilestoneBadge } from '../src/utils/badgeUtils';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn(
    (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  ),
}));

jest.mock('../src/utils/badgeUtils', () => ({
  awardMilestoneBadge: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/badges', badgesRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('badgeController', () => {
  it('returns 400 when email missing', async () => {
    const res = await request(app).post('/badges/milestone').send({ badge: 'helper' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Email and badge required' });
  });

  it('returns 400 when badge missing', async () => {
    const res = await request(app).post('/badges/milestone').send({ email: 'user@example.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Email and badge required' });
  });

  it('awards milestone badge and returns card url', async () => {
    (awardMilestoneBadge as jest.Mock).mockReturnValue('/cards/thanks.pdf');
    const res = await request(app)
      .post('/badges/milestone')
      .send({ email: 'user@example.com', badge: 'helper' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cardUrl: '/cards/thanks.pdf' });
    expect(awardMilestoneBadge).toHaveBeenCalledWith('user@example.com', 'helper');
  });
});

export {};
