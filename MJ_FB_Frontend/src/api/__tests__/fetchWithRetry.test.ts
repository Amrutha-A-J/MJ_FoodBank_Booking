import { fetchWithRetry } from '../fetchWithRetry';

const realFetch = global.fetch;

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = realFetch;
    jest.resetAllMocks();
  });

  it('returns immediately on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response('ok', { status: 200 }));
    const res = await fetchWithRetry('/test', {}, 2, 100);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(setTimeout).not.toHaveBeenCalled();
  });

  it('retries on network failure with exponential backoff', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('net1'))
      .mockRejectedValueOnce(new Error('net2'))
      .mockResolvedValueOnce(new Response('ok'));

    const promise = fetchWithRetry('/test', {}, 2, 100);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(2);

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 200);
    jest.runOnlyPendingTimers();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);

    const delays = timeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(delays).toEqual([100, 200]);
  });

  it('does not retry on 5xx response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response(null, { status: 500 }));
    const res = await fetchWithRetry('/test', {}, 2, 100);
    expect(res.status).toBe(500);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(setTimeout).not.toHaveBeenCalled();
  });
});

