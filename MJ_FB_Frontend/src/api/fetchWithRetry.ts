const MAX_BACKOFF_DELAY = 2_147_483_647; // match Node.js maximum timeout (~24.8 days)

function computeBackoffDelay(base: number, attempt: number): number {
  if (!Number.isFinite(base)) {
    return 0;
  }
  const normalizedBase = Math.max(0, base);
  const normalizedAttempt = Number.isFinite(attempt)
    ? Math.max(0, Math.floor(attempt))
    : 0;

  let delay = normalizedBase;
  for (let step = 0; step < normalizedAttempt; step += 1) {
    if (delay >= MAX_BACKOFF_DELAY) {
      return MAX_BACKOFF_DELAY;
    }
    delay *= 2;
  }

  if (!Number.isFinite(delay)) {
    return MAX_BACKOFF_DELAY;
  }

  return Math.min(delay, MAX_BACKOFF_DELAY);
}

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
    if (i < retries) {
      const delay = computeBackoffDelay(backoff, i);
      await new Promise<void>(resolve => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          resolve();
        }, delay);
      });
    }
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
