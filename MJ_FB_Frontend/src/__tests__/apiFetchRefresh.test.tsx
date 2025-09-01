import { apiFetch } from '../api/client';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';

describe('apiFetch refresh handling', () => {
  let fetchMock: jest.Mock;
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    document.cookie = 'csrfToken=test';
    localStorage.setItem('role', 'test');
    Object.defineProperty(window, 'location', {
      value: { assign: jest.fn(), pathname: '/' },
      writable: true,
    });
    fetchMock = mockFetch();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation });
    restoreFetch();
    jest.resetAllMocks();
    document.cookie = '';
    localStorage.clear();
  });

  it('redirects when refresh returns unexpected status', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await apiFetch('/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });

  it('redirects when refresh encounters network error', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    await apiFetch('/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });
});
