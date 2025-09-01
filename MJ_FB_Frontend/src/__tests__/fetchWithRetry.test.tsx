import { fetchWithRetry } from '../api/fetchWithRetry';

describe('fetchWithRetry', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('retries on 5xx responses', async () => {
    const first = new Response(null, { status: 500 });
    const second = new Response(null, { status: 200 });
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    global.fetch = mockFetch as any;

    const res = await fetchWithRetry('/test', {}, 1, 0);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res).toBe(second);
  });

  it('retries on configured status codes', async () => {
    const first = new Response(null, { status: 429 });
    const second = new Response(null, { status: 200 });
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    global.fetch = mockFetch as any;

    const res = await fetchWithRetry('/test', {}, 1, 0, [429]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res).toBe(second);
  });
});

