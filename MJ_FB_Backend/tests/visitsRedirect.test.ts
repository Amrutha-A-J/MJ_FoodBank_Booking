import request from 'supertest';
import app from '../src/app';

describe('legacy /visits redirect', () => {
  it('redirects /api/visits to /api/client-visits', async () => {
    const res = await request(app).get('/api/visits').expect(308);
    expect(res.headers.location).toBe('/api/client-visits');
  });

  it('preserves subpaths and query parameters', async () => {
    const res = await request(app)
      .get('/api/visits/stats?days=5')
      .expect(308);
    expect(res.headers.location).toBe('/api/client-visits/stats?days=5');
  });
});
