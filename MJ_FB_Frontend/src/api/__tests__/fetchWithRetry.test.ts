import { fetchWithRetry } from '../fetchWithRetry';
import { mockFetch, restoreFetch } from '../../../testUtils/mockFetch';
import { act } from 'react';

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
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 200);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
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
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

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
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
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

