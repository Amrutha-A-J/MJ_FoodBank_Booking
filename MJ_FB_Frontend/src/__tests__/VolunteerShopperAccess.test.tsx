import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { loginVolunteer } from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  loginVolunteer: jest.fn(),
}));

jest.mock('../components/VolunteerDashboard', () => () => <div>VolunteerDashboard</div>);
jest.mock('../components/VolunteerSchedule', () => () => <div>VolunteerSchedule</div>);
jest.mock('../components/VolunteerBookingHistory', () => () => <div>VolunteerHistory</div>);
jest.mock('../components/SlotBooking', () => () => <div>SlotBooking Component</div>);
jest.mock('../components/StaffDashboard/UserHistory', () => () => <div>BookingHistory Component</div>);


describe('Volunteer with shopper profile', () => {
  it('shows booking links and allows access to booking routes', async () => {
    localStorage.clear();
    (loginVolunteer as jest.Mock).mockResolvedValue({
      role: 'volunteer',
      name: 'Test',
      userRole: 'shopper',
    });

    render(<App />);

    fireEvent.click(screen.getByText(/volunteer login/i));

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'vol' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByRole('link', { name: /Booking Slots/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Booking Slots/i }));
    expect(screen.getByText(/SlotBooking Component/i)).toBeInTheDocument();
  });
});
