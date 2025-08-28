import { apiFetch } from '../api/client';

describe('apiFetch refresh handling', () => {
  beforeEach(() => {
    document.cookie = 'csrfToken=test';
    localStorage.setItem('role', 'test');
    Object.defineProperty(window, 'location', {
      value: { assign: jest.fn(), pathname: '/' },
      writable: true,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('redirects when refresh returns unexpected status', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await apiFetch('/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });

  it('redirects when refresh encounters network error', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    await apiFetch('/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });
});
