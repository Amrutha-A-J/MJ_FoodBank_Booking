import { render, screen } from '@testing-library/react';
import App from '../App';

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn().mockResolvedValue([]),
  getSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([]),
}));

describe('App authentication persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows login when not authenticated', () => {
    render(<App />);
    expect(screen.getByText(/user login/i)).toBeInTheDocument();
  });

  it('keeps user logged in when token exists', () => {
    localStorage.setItem('token', 'loggedin');
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    render(<App />);
    expect(screen.queryByText(/user login/i)).not.toBeInTheDocument();
  });
});
