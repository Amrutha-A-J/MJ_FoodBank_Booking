export async function fetchWithRetry(
  resource: RequestInfo | URL,
  options: RequestInit,
  retries = 1,
  backoff = 300,
  retryStatusCodes: number[] = [],
): Promise<Response> {
  const url =
    typeof resource === 'string' || resource instanceof URL
      ? resource.toString()
      : resource.url;
  let lastResponse: Response | undefined;
  let lastStatus = 0;

  for (let i = 0; i <= retries; i++) {
    try {
      const req =
        resource instanceof Request ? resource.clone() : resource;
      const res = await fetch(req, options);
      lastResponse = res;
      lastStatus = res.status;
      const shouldRetry =
        res.status >= 500 || retryStatusCodes.includes(res.status);
      if (!shouldRetry) {
        return res;
      }
    } catch (e) {
      lastResponse = undefined;
      lastStatus = 0;
      if (i === retries) break;
    }
    if (i < retries)
      await new Promise(res => setTimeout(res, backoff * 2 ** i));
  }

  const error: any = new Error(
    `Failed to fetch ${url} (last status ${lastStatus}) after ${
      retries + 1
    } attempts`,
  );
  error.url = url;
  error.status = lastStatus;
  error.response = lastResponse;
  throw error;
}
