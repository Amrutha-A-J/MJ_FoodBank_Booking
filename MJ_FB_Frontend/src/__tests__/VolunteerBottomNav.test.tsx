import VolunteerBottomNav from '../components/VolunteerBottomNav';
import { renderWithProviders, screen } from '../../testUtils/renderWithProviders';

describe('VolunteerBottomNav', () => {
  const originalPath = window.location.pathname;

  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/volunteer');
  });

  afterEach(() => {
    window.history.pushState({}, '', originalPath);
  });

  it('shows shopper actions when userRole is shopper', () => {
    localStorage.setItem('role', 'volunteer');
    localStorage.setItem('userRole', 'shopper');
    renderWithProviders(<VolunteerBottomNav />);
    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('hides shopper actions when userRole is not shopper', () => {
    localStorage.setItem('role', 'volunteer');
    renderWithProviders(<VolunteerBottomNav />);
    expect(screen.queryByText('Bookings')).toBeNull();
    expect(screen.queryByText('Profile')).toBeNull();
  });
});
