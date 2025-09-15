import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

jest.mock('../api/client', () => ({
  API_BASE: '',
  apiFetch: jest.fn(),
}));

const { apiFetch } = require('../api/client');

jest.mock('../pages/volunteer-management/VolunteerDashboard', () => {
  const { Link } = require('react-router-dom');
  return () => (
    <div>
      VolunteerDashboard
      <Link to="/book-appointment">Book Shopping Appointment</Link>
    </div>
  );
});
jest.mock('../pages/volunteer-management/VolunteerSchedule', () => () => <div>VolunteerSchedule</div>);
jest.mock('../pages/volunteer-management/VolunteerBookingHistory', () => () => <div>VolunteerHistory</div>);
jest.mock('../pages/BookingUI', () => () => <div>BookingUI Component</div>);
jest.mock('../pages/staff/client-management/UserHistory', () => () => <div>BookingHistory Component</div>);

describe('Volunteer with shopper profile', () => {
  it('shows booking links and allows access to booking routes', async () => {
    localStorage.clear();
    localStorage.setItem('role', 'volunteer');
    localStorage.setItem('name', 'Test');
    localStorage.setItem('userRole', 'shopper');
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    renderWithProviders(<App />);

    await screen.findByText(/VolunteerDashboard/i);

    const bookLink = screen.getByRole('link', { name: /Book Shopping Appointment/i });
    expect(bookLink).toBeInTheDocument();

    fireEvent.click(bookLink);
    await screen.findByText(/BookingUI Component/i);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});
