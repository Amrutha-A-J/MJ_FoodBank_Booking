import { apiFetch } from '../api/client';

const realFetch = global.fetch;

describe('apiFetch refresh handling', () => {
  beforeEach(() => {
    document.cookie = 'csrfToken=test';
    localStorage.setItem('role', 'test');
    Object.defineProperty(window, 'location', {
      value: { assign: jest.fn(), pathname: '/' },
      writable: true,
    });
    global.fetch = jest.fn().mockResolvedValue(new Response(null));
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.resetAllMocks();
  });

  it('redirects when refresh returns unexpected status', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await apiFetch('/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });

  it('redirects when refresh encounters network error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    await apiFetch('/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });
});
