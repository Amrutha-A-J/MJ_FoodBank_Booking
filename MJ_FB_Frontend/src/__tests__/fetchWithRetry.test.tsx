import { fetchWithRetry } from '../api/fetchWithRetry';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';

describe('fetchWithRetry', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  afterEach(() => {
    restoreFetch();
    jest.resetAllMocks();
  });

  it('retries on 5xx responses', async () => {
    const first = new Response(null, { status: 500 });
    const second = new Response(null, { status: 200 });
    fetchMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const res = await fetchWithRetry('/test', {}, 1, 0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res).toBe(second);
  });

  it('retries on configured status codes', async () => {
    const first = new Response(null, { status: 429 });
    const second = new Response(null, { status: 200 });
    fetchMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const res = await fetchWithRetry('/test', {}, 1, 0, [429]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res).toBe(second);
  });
});

