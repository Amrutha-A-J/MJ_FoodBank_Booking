import { apiFetch, __resetCsrfTokenForTests } from '../api/client';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';

describe('apiFetch refresh handling', () => {
  let fetchMock: jest.Mock;
  let locationDescriptor: PropertyDescriptor;
  let locationHref: string;
  let locationOrigin: string;

  beforeEach(() => {
    locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')!;
    locationHref = window.location.href;
    locationOrigin = window.location.origin;
    __resetCsrfTokenForTests();
    localStorage.setItem('role', 'test');
    Object.defineProperty(window, 'location', {
      value: {
        assign: jest.fn(),
        pathname: '/',
        href: locationHref,
        origin: locationOrigin,
      },
      writable: true,
      configurable: true,
    });
    fetchMock = mockFetch();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', locationDescriptor);
    restoreFetch();
    jest.resetAllMocks();
    __resetCsrfTokenForTests();
    localStorage.clear();
  });

  it('redirects when refresh returns unexpected status', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'test' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await apiFetch('http://localhost/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });

  it('redirects when refresh encounters network error', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'test' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    await apiFetch('http://localhost/test');
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });
});
