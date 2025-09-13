import { apiFetch } from '../api/client';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';

describe('clearAuthAndRedirect', () => {
  const originalLocationDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'location'
  )!;

  afterEach(() => {
    Object.defineProperty(window, 'location', originalLocationDescriptor);
    restoreFetch();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('redirects to /login by default', async () => {
    const assign = jest.fn();
    const locationMock = Object.assign(new URL('http://localhost/some'), {
      assign,
    });
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
      configurable: true,
    });

    mockFetch().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    await apiFetch(`${window.location.origin}/auth/refresh`);

    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('does not redirect from set-password path', async () => {
    const assign = jest.fn();
    const locationMock = Object.assign(
      new URL('http://localhost/set-password'),
      {
        assign,
      },
    );
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
      configurable: true,
    });

    mockFetch().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
    } as Response);

    await apiFetch(`${window.location.origin}/auth/refresh`);

    expect(assign).not.toHaveBeenCalled();
  });
});

