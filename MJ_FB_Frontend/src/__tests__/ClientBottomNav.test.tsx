import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientBottomNav from '../components/ClientBottomNav';

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ClientBottomNav', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({ role: 'shopper' });
  });

  it('highlights bookings tab on booking routes', () => {
    render(
      <MemoryRouter initialEntries={['/booking-history']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('bookings')).toHaveClass('Mui-selected');
  });

  it('navigates to profile when profile tab clicked', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText('profile'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('does not render for staff users', () => {
    mockUseAuth.mockReturnValue({ role: 'staff' });
    const { queryByLabelText } = render(
      <MemoryRouter initialEntries={['/']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    expect(queryByLabelText('dashboard')).not.toBeInTheDocument();
  });

  it('shows delivery navigation for delivery clients', () => {
    mockUseAuth.mockReturnValue({ role: 'delivery' });
    render(
      <MemoryRouter initialEntries={['/delivery/history']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('delivery')).toHaveClass('Mui-selected');
    expect(screen.queryByLabelText('bookings')).not.toBeInTheDocument();
  });

  it('navigates delivery clients to the delivery booking page', () => {
    mockUseAuth.mockReturnValue({ role: 'delivery' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText('delivery'));
    expect(mockNavigate).toHaveBeenCalledWith('/delivery/book');
  });

  it('uses a larger tap target', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    const nav = container.querySelector('.MuiBottomNavigation-root');
    expect(nav).toHaveStyle('height: 72px');
  });
});
