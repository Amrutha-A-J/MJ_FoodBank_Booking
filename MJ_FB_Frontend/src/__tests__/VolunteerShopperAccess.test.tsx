import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { login } from '../api/users';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

jest.mock('../api/client', () => ({
  API_BASE: '',
  apiFetch: jest.fn(),
}));

jest.mock('../api/users', () => ({
  login: jest.fn(),
}));

const { apiFetch } = require('../api/client');

jest.mock('../pages/volunteer-management/VolunteerDashboard', () => () => <div>VolunteerDashboard</div>);
jest.mock('../pages/volunteer-management/VolunteerSchedule', () => () => <div>VolunteerSchedule</div>);
jest.mock('../pages/volunteer-management/VolunteerBookingHistory', () => () => <div>VolunteerHistory</div>);
jest.mock('../pages/BookingUI', () => () => <div>BookingUI Component</div>);
jest.mock('../pages/staff/client-management/UserHistory', () => () => <div>BookingHistory Component</div>);


describe('Volunteer with shopper profile', () => {
  it('shows booking links and allows access to booking routes', async () => {
    localStorage.clear();
    (login as jest.Mock).mockResolvedValue({
      role: 'volunteer',
      name: 'Test',
      userRole: 'shopper',
    });

    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    renderWithProviders(<App />);

    fireEvent.click(await screen.findByText(/login/i));

    fireEvent.change(await screen.findByLabelText(/client id or email/i), {
      target: { value: 'vol@example.com' },
    });
    fireEvent.change(
      await screen.findByLabelText(/password/i, { selector: 'input' }),
      { target: { value: 'pass' } },
    );
    fireEvent.click(await screen.findByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /Book Shopping Appointment/i }),
      ).toBeInTheDocument(),
    );
    expect(login).toHaveBeenCalledWith('vol@example.com', 'pass');
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('link', { name: /Book Shopping Appointment/i }),
    );
    expect(screen.getByText(/BookingUI Component/i)).toBeInTheDocument();
  });
});
