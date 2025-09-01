import { fetchWithRetry } from '../api/fetchWithRetry';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';

describe('fetchWithRetry', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = mockFetch();
  });

  afterEach(async () => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    restoreFetch();
    jest.resetAllMocks();
    await Promise.resolve();
  });

  it('retries on 5xx responses', async () => {
    const first = new Response(null, { status: 500 });
    const second = new Response(null, { status: 200 });
    fetchMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const promise = fetchWithRetry('/test', {}, 1, 0);
    await Promise.resolve();
    jest.runAllTimers();
    const res = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res).toBe(second);
  });

  it('retries on configured status codes', async () => {
    const first = new Response(null, { status: 429 });
    const second = new Response(null, { status: 200 });
    fetchMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const promise = fetchWithRetry('/test', {}, 1, 0, [429]);
    await Promise.resolve();
    jest.runAllTimers();
    const res = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res).toBe(second);
  });
});

