export async function fetchWithRetry(
  resource: RequestInfo | URL,
  options: RequestInit,
  retries = 1,
  backoff = 300,
  retryStatusCodes: number[] = [],
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(resource, options);
      const shouldRetry =
        res.status >= 500 || retryStatusCodes.includes(res.status);
      if (!shouldRetry || i === retries) {
        return res;
      }
    } catch (e) {
      if (i === retries) throw e;
    }
    await new Promise(res => setTimeout(res, backoff * 2 ** i));
  }
  throw new Error('Unreachable');
}
