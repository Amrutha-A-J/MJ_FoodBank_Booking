let originalFetch: typeof global.fetch | undefined;
let isMocked = false;

export function mockFetch() {
  if (!isMocked) {
    originalFetch = global.fetch;
    isMocked = true;
  }
  const fetchMock = jest.fn();
  global.fetch = fetchMock as any;
  return fetchMock;
}

export function restoreFetch() {
  if (isMocked && originalFetch) {
    global.fetch = originalFetch;
    isMocked = false;
  }
}
