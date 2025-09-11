import { fetchWithRetry } from '../fetchWithRetry';
import { mockFetch, restoreFetch } from '../../../testUtils/mockFetch';

let fetchMock: jest.Mock;

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = mockFetch();
  });

  afterEach(() => {
    jest.useRealTimers();
    restoreFetch();
    jest.resetAllMocks();
  });

  it('returns immediately on success', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    const res = await fetchWithRetry('/test', {}, 2, 100);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('retries on network failure with exponential backoff', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    fetchMock
      .mockRejectedValueOnce(new Error('net1'))
      .mockRejectedValueOnce(new Error('net2'))
      .mockResolvedValueOnce(new Response('ok'));

    const promise = fetchWithRetry('/test', {}, 2, 100);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await Promise.resolve();
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 200);
    jest.runOnlyPendingTimers();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const delays = timeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(delays).toEqual([100, 200]);
  });

  it('does not retry on 5xx response', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const res = await fetchWithRetry('/test', {}, 2, 100);
    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('throws after exhausting retries', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    fetchMock.mockRejectedValue(new Error('net'));

    const promise = fetchWithRetry('/test', {}, 1, 100);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    jest.runOnlyPendingTimers();
    await Promise.resolve();

    await expect(promise).rejects.toThrow(
      'Failed to fetch after 2 attempts',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

