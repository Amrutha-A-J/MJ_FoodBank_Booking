import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { login } from '../api/users';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

jest.mock('../api/users', () => ({
  login: jest.fn(),
}));

jest.mock('../pages/agency/AgencyBookAppointment', () => () => <div>AgencyBookAppointment</div>);
jest.mock('../pages/agency/ClientHistory', () => () => <div>AgencyClientHistory</div>);

describe('Agency UI access', () => {
  const originalLocation = window.location;
  let fetchMock: jest.Mock;
  let assign: jest.Mock;

  beforeEach(() => {
    assign = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, assign, pathname: '/' },
      writable: true,
    });
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      headers: new Headers(),
    });
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    restoreFetch();
    Object.defineProperty(window, 'location', { value: originalLocation });
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
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /book appointment/i })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('link', { name: /booking history/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /clients/i })).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users away from agency routes', async () => {
    window.location.pathname = '/agency/book';
    renderWithProviders(<App />);
    await waitFor(() => expect(screen.getByText(/login/i)).toBeInTheDocument());
  });
});
