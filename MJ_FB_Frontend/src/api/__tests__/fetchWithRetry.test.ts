import { fetchWithRetry } from '../fetchWithRetry';
import { mockFetch, restoreFetch } from '../../../testUtils/mockFetch';

let fetchMock: jest.Mock;
let setTimeoutSpy: jest.SpyInstance<
  ReturnType<typeof setTimeout>,
  Parameters<typeof setTimeout>
>;
let clearTimeoutSpy: jest.SpyInstance<void, Parameters<typeof clearTimeout>>;

describe('fetchWithRetry', () => {
  beforeEach(() => {
    fetchMock = mockFetch();
    let nextTimeoutId = 1;
    const pendingTimeouts = new Map<number, () => void>();
    setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((
        callback: Parameters<typeof setTimeout>[0],
        delay?: number,
        ...args: unknown[]
      ) => {
        const timeoutId = nextTimeoutId;
        nextTimeoutId += 1;
        if (typeof callback === 'function') {
          pendingTimeouts.set(timeoutId, () => {
            pendingTimeouts.delete(timeoutId);
            (callback as (...callbackArgs: unknown[]) => void)(...args);
          });
          queueMicrotask(() => {
            const invoke = pendingTimeouts.get(timeoutId);
            if (invoke) {
              invoke();
            }
          });
        }
        return timeoutId as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout);

    clearTimeoutSpy = jest
      .spyOn(global, 'clearTimeout')
      .mockImplementation(((timeoutId: Parameters<typeof clearTimeout>[0]) => {
        pendingTimeouts.delete(timeoutId as unknown as number);
      }) as typeof clearTimeout);
  });

  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('returns immediately on success', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    const res = await fetchWithRetry('/test', {}, 2, 100);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('retries on network failure with exponential backoff', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('net1'))
      .mockRejectedValueOnce(new Error('net2'))
      .mockResolvedValueOnce(new Response('ok'));

    const promise = fetchWithRetry('/test', {}, 2, 100);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    const delays = setTimeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(delays).toEqual([100, 200]);
  });

  it('retries on 5xx response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    const promise = fetchWithRetry('/test', {}, 1, 100);

    await expect(promise).rejects.toThrow(
      'Failed to fetch /test (last status 503) after 2 attempts',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    const delays = setTimeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(delays).toEqual([100]);
  });

  it('throws after exhausting retries', async () => {
    fetchMock.mockRejectedValue(new Error('net'));

    const promise = fetchWithRetry('/test', {}, 1, 100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    await expect(promise).rejects.toThrow(
      'Failed to fetch /test (last status 0) after 2 attempts',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it('clones Request for each retry', async () => {
    const resource = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });
    fetchMock
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(new Response('ok'));

    const promise = fetchWithRetry(resource, {}, 1, 100);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    const firstReq = fetchMock.mock.calls[0][0];
    const secondReq = fetchMock.mock.calls[1][0];
    expect(firstReq).not.toBe(secondReq);
    expect(await firstReq.clone().text()).toBe(
      await secondReq.clone().text(),
    );
    expect(resource.bodyUsed).toBe(false);
  });
});

