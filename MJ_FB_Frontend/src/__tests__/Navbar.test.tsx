import { render, screen, fireEvent, within } from '@testing-library/react';
import Navbar from '../components/Navbar';
import { MemoryRouter } from 'react-router-dom';

describe('Navbar component', () => {
  it('renders with title and name', () => {
    render(
      <MemoryRouter>
        <Navbar
          groups={[{ label: 'Home', links: [{ label: 'Home', to: '/' }] }]}
          onLogout={() => {}}
          name="Tester"
        />
      </MemoryRouter>
    );

    expect(screen.getByAltText(/Food Bank logo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Food Bank Portal/i)).toBeNull();
    expect(screen.getByText(/Hello, Tester/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Hello, Tester/i));
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Help/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  it('shows staff tools links in a dedicated nav group', () => {
    render(
      <MemoryRouter>
        <Navbar
          groups={[
            { label: 'Home', links: [{ label: 'Home', to: '/' }] },
            {
              label: 'Staff Tools',
              links: [
                { label: 'Timesheets', to: '/timesheet' },
                { label: 'Leave Management', to: '/leave-requests' },
              ],
            },
          ]}
          onLogout={() => {}}
          name="Tester"
          role="staff"
          profileLinks={[{ label: 'News & Events', to: '/events' }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Staff Tools/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Staff Tools/i));
    expect(screen.getByText(/Timesheets/i)).toBeInTheDocument();
    expect(screen.getByText(/Leave Management/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Hello, Tester/i));
    const profileMenu = document.getElementById('profile-menu') as HTMLElement;
    expect(within(profileMenu).queryByText(/Timesheets/i)).toBeNull();
    expect(within(profileMenu).queryByText(/Leave Management/i)).toBeNull();
  });

  it('renders without greeting when name is absent', () => {
    render(
      <MemoryRouter>
        <Navbar
          groups={[{ label: 'Home', links: [{ label: 'Home', to: '/' }] }]}
          onLogout={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByAltText(/Food Bank logo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Food Bank Portal/i)).toBeNull();
    expect(screen.queryByText(/Hello/)).toBeNull();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });

  it('moves greeting into hamburger menu on small screens', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = () =>
      ({
        matches: true,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as any;

    try {
      render(
        <MemoryRouter>
          <Navbar
            groups={[{ label: 'Home', links: [{ label: 'Home', to: '/' }] }]}
            onLogout={() => {}}
            name="Tester"
          />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Hello, Tester/i)).toBeNull();
      fireEvent.click(screen.getByLabelText(/open navigation menu/i));
      expect(screen.getByText(/Hello, Tester/i)).toBeInTheDocument();
      expect(screen.getByText(/Profile/i)).toBeInTheDocument();
      expect(screen.getByText(/Help/i)).toBeInTheDocument();
      expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
