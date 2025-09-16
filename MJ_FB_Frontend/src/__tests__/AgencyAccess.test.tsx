import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { login } from '../api/users';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

jest.mock('../api/users', () => ({
  login: jest.fn(),
  staffExists: jest.fn().mockResolvedValue(true),
}));

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn().mockResolvedValue([]),
  getSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([]),
  cancelBooking: jest.fn(),
}));

jest.mock('../api/events', () => ({
  getEvents: jest.fn().mockResolvedValue({ today: [], upcoming: [], past: [] }),
}));

describe('Agency UI access', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ csrfToken: 'token' }),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
        headers: new Headers(),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ cardUrl: '' }),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    restoreFetch();
    jest.clearAllMocks();
  });

  it('allows agency login and shows booking links', async () => {
    (login as jest.Mock).mockResolvedValue({
      role: 'shopper',
      name: 'Agency',
      id: 1,
    });

    renderWithProviders(<App />);

    const loginLink = await screen.findByRole('link', { name: /login/i });
    fireEvent.click(loginLink);

    const emailField = await screen.findByLabelText(/email/i);
    fireEvent.change(emailField, {
      target: { value: 'a@b.com' },
    });
    const passwordField = await screen.findByLabelText(/password/i, {
      selector: 'input',
    });
    fireEvent.change(passwordField, {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    const bookingMenuButton = await screen.findByRole('button', {
      name: /booking/i,
    });
    fireEvent.click(bookingMenuButton);

    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: /book shopping appointment/i })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('menuitem', { name: /booking history/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /clients/i })).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users away from booking routes', async () => {
    window.history.pushState({}, '', '/book-appointment');

    renderWithProviders(<App />);

    await waitFor(() => expect(screen.getByText(/login/i)).toBeInTheDocument());
  });
});
