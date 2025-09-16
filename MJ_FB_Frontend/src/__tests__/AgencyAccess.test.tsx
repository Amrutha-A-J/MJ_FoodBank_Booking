import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { login } from '../api/users';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as Response;
}

jest.mock('../api/users', () => ({
  login: jest.fn(),
}));

jest.mock('../pages/agency/AgencyBookAppointment', () => () => <div>AgencyBookAppointment</div>);
jest.mock('../pages/agency/ClientHistory', () => () => <div>AgencyClientHistory</div>);

describe('Agency UI access', () => {
  const originalLocation = window.location;
  let fetchMock: jest.Mock;
  let assign: jest.Mock;
  let locationMock: URL;
  let originalPushState: History['pushState'];
  let originalReplaceState: History['replaceState'];

  function updateLocation(url: string | URL | null | undefined) {
    if (!url) return;
    if (typeof url === 'string') {
      locationMock.href = new URL(url, locationMock.href).toString();
    } else {
      locationMock.href = url.toString();
    }
  }

  beforeEach(() => {
    assign = jest.fn();
    locationMock = new URL('http://localhost/');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: Object.assign(locationMock, { assign }),
    });
    originalPushState = window.history.pushState;
    originalReplaceState = window.history.replaceState;
    window.history.pushState = ((state, title, url) => {
      originalPushState.call(window.history, state, title, url);
      updateLocation(url);
    }) as History['pushState'];
    window.history.replaceState = ((state, title, url) => {
      originalReplaceState.call(window.history, state, title, url);
      updateLocation(url);
    }) as History['replaceState'];
    fetchMock = mockFetch();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (requestUrl.includes('/auth/csrf-token')) {
        return Promise.resolve(jsonResponse(200, { csrfToken: 'test-token' }));
      }
      if (requestUrl.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse(200, {}));
      }
      if (requestUrl.includes('/staff/exists')) {
        return Promise.resolve(jsonResponse(200, { exists: true }));
      }
      if (requestUrl.includes('/stats')) {
        return Promise.resolve(jsonResponse(200, { cardUrl: '' }));
      }
      return Promise.resolve(jsonResponse(401, {}));
    });
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    restoreFetch();
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    jest.resetAllMocks();
  });

  it('allows agency login and shows agency links', async () => {
    (login as jest.Mock).mockResolvedValue({
      role: 'agency',
      name: 'Agency',
      id: 1,
    });
    renderWithProviders(<App />);

    const loginLink = await screen.findByRole('link', { name: /login/i });
    fireEvent.click(loginLink);
    const emailInput = await screen.findByLabelText(/email/i);
    fireEvent.change(emailInput, {
      target: { value: 'a@b.com' },
    });
    const passwordInput = await screen.findByLabelText(/password/i, { selector: 'input' });
    fireEvent.change(passwordInput, {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await screen.findByRole('heading', { name: /agency dashboard/i });
    fireEvent.click(screen.getByRole('button', { name: /^agency$/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: /book appointment/i })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('menuitem', { name: /booking history/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /schedule/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /clients/i })
    ).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users away from agency routes', async () => {
    window.location.pathname = '/agency/book';
    renderWithProviders(<App />);
    await waitFor(() => expect(screen.getByText(/login/i)).toBeInTheDocument());
  });
});
