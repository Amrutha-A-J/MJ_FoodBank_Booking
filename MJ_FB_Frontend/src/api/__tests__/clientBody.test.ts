import { apiFetch, API_BASE, __resetCsrfTokenForTests } from '../client';
import { mockFetch, restoreFetch } from '../../../testUtils/mockFetch';

let fetchMock: jest.Mock;

describe('apiFetch preserves body on refresh', () => {
  beforeEach(() => {
    fetchMock = mockFetch();
    __resetCsrfTokenForTests();
  });

  afterEach(() => {
    restoreFetch();
    jest.resetAllMocks();
    __resetCsrfTokenForTests();
  });

  it('reuses multipart body after token refresh', async () => {
    const form = new FormData();
    form.append('a', '1');
    const bodies: string[] = [];

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'test' }), { status: 200 }),
      )
      .mockImplementationOnce(async (req: Request) => {
        bodies.push(await req.text());
        return new Response(null, { status: 401 });
      })
      .mockImplementationOnce(async () => new Response(null, { status: 200 }))
      .mockImplementationOnce(async (req: Request) => {
        bodies.push(await req.text());
        return new Response(null, { status: 200 });
      });

    const res = await apiFetch(`${API_BASE}/upload`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toBe(bodies[1]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
