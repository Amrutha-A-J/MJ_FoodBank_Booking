export async function fetchWithRetry(
  resource: RequestInfo | URL,
  options: RequestInit,
  retries = 1,
  backoff = 300,
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(resource, options);
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(res => setTimeout(res, backoff * 2 ** i));
    }
  }
  throw new Error('Unreachable');
}
