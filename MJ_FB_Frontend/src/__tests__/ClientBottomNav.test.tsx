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
    fireEvent.click(screen.getByLabelTex"Profile");
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('does not render for staff users', () => {
    mockUseAuth.mockReturnValue({ role: 'staff' });
    const { queryByLabelText } = render(
      <MemoryRouter initialEntries={['/']}>
        <ClientBottomNav />
      </MemoryRouter>,
    );
    expect(queryByLabelTex"Dashboard").not.toBeInTheDocument();
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
