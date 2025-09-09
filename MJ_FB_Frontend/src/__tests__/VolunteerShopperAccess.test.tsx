import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { loginVolunteer } from '../api/volunteers';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

jest.mock('../api/volunteers', () => ({
  loginVolunteer: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
}));

jest.mock('../pages/volunteer-management/VolunteerDashboard', () => () => <div>VolunteerDashboard</div>);
jest.mock('../pages/volunteer-management/VolunteerSchedule', () => () => <div>VolunteerSchedule</div>);
jest.mock('../pages/volunteer-management/VolunteerBookingHistory', () => () => <div>VolunteerHistory</div>);
jest.mock('../pages/BookingUI', () => () => <div>BookingUI Component</div>);
jest.mock('../pages/staff/client-management/UserHistory', () => () => <div>BookingHistory Component</div>);


describe('Volunteer with shopper profile', () => {
  it('shows booking links and allows access to booking routes', async () => {
    localStorage.clear();
    (loginVolunteer as jest.Mock).mockResolvedValue({
      role: 'volunteer',
      name: 'Test',
      userRole: 'shopper',
    });

    renderWithProviders(<App />);

    fireEvent.click(await screen.findByText(/volunteer login/i));

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'vol@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Book Appointment/i })).toBeInTheDocument(),
    );
    expect(loginVolunteer).toHaveBeenCalledWith('vol@example.com', 'pass');
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Book Appointment/i }));
    expect(screen.getByText(/BookingUI Component/i)).toBeInTheDocument();
  });

  it('hides booking links when volunteer lacks shopper profile', async () => {
    localStorage.clear();
    (loginVolunteer as jest.Mock).mockResolvedValue({
      role: 'volunteer',
      name: 'Test',
    });

    renderWithProviders(<App />);

    fireEvent.click(await screen.findByText(/volunteer login/i));

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'vol@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(loginVolunteer).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /Book Appointment/i })).not.toBeInTheDocument();
  });
});
