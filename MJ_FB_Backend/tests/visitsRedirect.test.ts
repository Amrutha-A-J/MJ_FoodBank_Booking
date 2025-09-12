import request from 'supertest';
import app from '../src/app';

describe('legacy /visits redirect', () => {
  it('redirects /api/v1/visits to /api/v1/client-visits', async () => {
    const res = await request(app).get('/api/v1/visits').expect(308);
    expect(res.headers.location).toBe('/api/v1/client-visits');
  });

  it('preserves subpaths and query parameters', async () => {
    const res = await request(app)
      .get('/api/v1/visits/stats?days=5')
      .expect(308);
    expect(res.headers.location).toBe('/api/v1/client-visits/stats?days=5');
  });
});
