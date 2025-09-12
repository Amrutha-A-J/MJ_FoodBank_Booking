import request from 'supertest';
import app from '../src/app';

describe('/api redirect', () => {
  it('redirects unversioned paths to /api/v1', async () => {
    const res = await request(app).get('/api/health').expect(308);
    expect(res.headers.location).toBe('/api/v1/health');
  });
});
