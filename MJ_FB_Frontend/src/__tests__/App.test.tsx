import { render, screen } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';

jest.mock('../api/api', () => ({
  getBookingHistory: jest.fn().mockResolvedValue([]),
  getSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([]),
}));

describe('App authentication persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows login when not authenticated', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(screen.getByText(/user login/i)).toBeInTheDocument();
  });

  it('keeps user logged in when token exists', () => {
    localStorage.setItem('token', 'testtoken');
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(screen.queryByText(/user login/i)).not.toBeInTheDocument();
  });
});
