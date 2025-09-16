import { fetchWithRetry } from '../fetchWithRetry';
import { mockFetch, restoreFetch } from '../../../testUtils/mockFetch';

let fetchMock: jest.Mock;

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = mockFetch();
  });

  const flushNextTimer = async () => {
    await Promise.resolve();
    jest.runOnlyPendingTimers();
    expect(jest.getTimerCount()).toBe(0);
    await Promise.resolve();
  };

  afterEach(() => {
    const remainingTimers = jest.getTimerCount();
    if (remainingTimers !== 0) {
      jest.runOnlyPendingTimers();
      jest.clearAllTimers();
    }
    expect(remainingTimers).toBe(0);
    jest.useRealTimers();
    restoreFetch();
    jest.restoreAllMocks();
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

    await flushNextTimer();
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await flushNextTimer();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const delays = timeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(delays).toEqual([100, 200]);
  });

  it('retries on 5xx response', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    const promise = fetchWithRetry('/test', {}, 1, 100);

    await flushNextTimer();

    await expect(promise).rejects.toThrow(
      'Failed to fetch /test (last status 503) after 2 attempts',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const delays = timeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(delays).toEqual([100]);
  });

  it('throws after exhausting retries', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    fetchMock.mockRejectedValue(new Error('net'));

    const promise = fetchWithRetry('/test', {}, 1, 100);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    await flushNextTimer();

    await expect(promise).rejects.toThrow(
      'Failed to fetch /test (last status 0) after 2 attempts',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clones Request for each retry', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const resource = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });
    fetchMock
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(new Response('ok'));

    const promise = fetchWithRetry(resource, {}, 1, 100);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    await flushNextTimer();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstReq = fetchMock.mock.calls[0][0];
    const secondReq = fetchMock.mock.calls[1][0];
    expect(firstReq).not.toBe(secondReq);
    expect(await firstReq.clone().text()).toBe(
      await secondReq.clone().text(),
    );
    expect(resource.bodyUsed).toBe(false);
  });
});

