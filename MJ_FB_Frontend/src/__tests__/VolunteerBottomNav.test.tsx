import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerBottomNav from '../components/VolunteerBottomNav';

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('VolunteerBottomNav', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({ role: 'volunteer', userRole: '' });
  });

  it('selects shifts tab when on schedule route', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer/schedule']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    const scheduleBtn = screen.getByRole('button', { name: /shifts/i });
    expect(scheduleBtn).toHaveClass('Mui-selected');
  });

  it('navigates to dashboard when dashboard tab clicked', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer/schedule']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/volunteer');
  });

  it('shows shopper navigation when userRole is shopper', () => {
    mockUseAuth.mockReturnValue({ role: 'volunteer', userRole: 'shopper' });
    render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /shopping/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
  });

  it('navigates to shopper pages', () => {
    mockUseAuth.mockReturnValue({ role: 'volunteer', userRole: 'shopper' });
    render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /shopping/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/book-appointment');
    fireEvent.click(screen.getByRole('button', { name: /profile/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('does not render for non-volunteer roles', () => {
    mockUseAuth.mockReturnValue({ role: 'staff', userRole: '' });
    const { queryByRole } = render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    expect(queryByRole('button', { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it('uses a larger tap target', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    const nav = container.querySelector('.MuiBottomNavigation-root');
    expect(nav).toHaveStyle('height: 72px');
  });

  it('shows a top border for contrast', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <VolunteerBottomNav />
      </MemoryRouter>,
    );
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toHaveStyle('border-top-width: 1px');
  });
});
