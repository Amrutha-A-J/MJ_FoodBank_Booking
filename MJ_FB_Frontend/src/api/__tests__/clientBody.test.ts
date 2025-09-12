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

describe('apiFetch retries invalid CSRF token', () => {
  beforeEach(() => {
    fetchMock = mockFetch();
    __resetCsrfTokenForTests();
  });

  afterEach(() => {
    restoreFetch();
    jest.resetAllMocks();
    __resetCsrfTokenForTests();
  });

  it('retries once and succeeds with new token', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'old' }), { status: 200 }),
      )
      .mockImplementationOnce(async (req: Request) => {
        expect(req.headers.get('X-CSRF-Token')).toBe('old');
        return new Response(
          JSON.stringify({ message: 'Invalid CSRF token' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      })
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'new' }), { status: 200 }),
      )
      .mockImplementationOnce(async (req: Request) => {
        expect(req.headers.get('X-CSRF-Token')).toBe('new');
        return new Response(null, { status: 200 });
      });

    const res = await apiFetch(`${API_BASE}/test`, { method: 'POST' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('retries once and propagates error on failure', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'old' }), { status: 200 }),
      )
      .mockImplementationOnce(async () =>
        new Response(
          JSON.stringify({ message: 'Invalid CSRF token' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'new' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'Invalid CSRF token' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const res = await apiFetch(`${API_BASE}/test`, { method: 'POST' });
    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
