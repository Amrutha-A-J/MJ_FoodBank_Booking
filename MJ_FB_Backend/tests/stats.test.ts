import request from 'supertest';
import express from 'express';
import statsRouter from '../src/routes/stats';
import { getBadgeCardLink } from '../src/utils/badgeUtils';
import { authMiddleware } from '../src/middleware/authMiddleware';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn(
    (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  ),
}));

jest.mock('../src/utils/badgeUtils', () => ({
  getBadgeCardLink: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/stats', statsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('stats routes', () => {
  it('returns card url when badge link exists', async () => {
    (getBadgeCardLink as jest.Mock).mockReturnValue('/cards/thanks.pdf');
    const res = await request(app)
      .get('/stats')
      .query({ email: 'user@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cardUrl: '/cards/thanks.pdf' });
    expect(getBadgeCardLink).toHaveBeenCalledWith('user@example.com');
  });

  it('returns empty object when badge link missing', async () => {
    (getBadgeCardLink as jest.Mock).mockReturnValue(undefined);
    const res = await request(app)
      .get('/stats')
      .query({ email: 'user@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it('returns 401 when not authenticated', async () => {
    (authMiddleware as jest.Mock).mockImplementationOnce(
      (_req: express.Request, res: express.Response) => {
        res.status(401).json({ message: 'Unauthorized' });
      },
    );
    const res = await request(app).get('/stats');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Unauthorized' });
  });
});
