import request from 'supertest';
import app from '../src/app';
import { upsertPushToken } from '../src/models/pushToken';

jest.mock('../src/models/pushToken', () => ({
  upsertPushToken: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => {
    _req.user = { id: '1', type: 'user', role: 'client' };
    next();
  },
}));

describe('notifications routes', () => {
  it('registers push token', async () => {
    await request(app)
      .post('/api/notifications/register')
      .send({ token: 'abc' })
      .expect(200);
    expect(upsertPushToken).toHaveBeenCalledWith(1, 'client', 'abc');
  });
});
