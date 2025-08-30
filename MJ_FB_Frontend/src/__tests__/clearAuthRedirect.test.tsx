import { apiFetch } from '../api/client';

describe('clearAuthAndRedirect', () => {
  const realFetch = global.fetch;
  const originalLocation = window.location;

  afterEach(() => {
    global.fetch = realFetch;
    window.location = originalLocation;
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('redirects to /login by default', async () => {
    const assign = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/some', assign },
      writable: true,
    });

    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    await apiFetch('/auth/refresh');

    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('does not redirect from set-password path', async () => {
    const assign = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/set-password', assign },
      writable: true,
    });

    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    await apiFetch('/auth/refresh');

    expect(assign).not.toHaveBeenCalled();
  });
});

