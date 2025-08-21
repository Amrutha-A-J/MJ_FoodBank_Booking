import { handleResponse } from '../api/client';

describe('handleResponse', () => {
  it('returns undefined for 204 responses', async () => {
    const res = new Response(null, { status: 204 });
    await expect(handleResponse(res)).resolves.toBeUndefined();
  });

  it('returns undefined for zero Content-Length', async () => {
    const res = new Response(null, { status: 200, headers: { 'Content-Length': '0' } });
    await expect(handleResponse(res)).resolves.toBeUndefined();
  });
});
