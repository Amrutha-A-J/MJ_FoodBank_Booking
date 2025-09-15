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
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  it('shows staff links only in the profile menu', () => {
    render(
      <MemoryRouter>
        <Navbar
          groups={[{ label: 'Home', links: [{ label: 'Home', to: '/' }] }]}
          onLogout={() => {}}
          name="Tester"
          role="staff"
          profileLinks={[
            { label: 'News & Events', to: '/events' },
            { label: 'Timesheets', to: '/timesheet' },
            { label: 'Leave Management', to: '/leave-requests' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Staff Tools/i)).toBeNull();
    fireEvent.click(screen.getByText(/Hello, Tester/i));
    const profileMenu = document.getElementById('profile-menu') as HTMLElement;
    expect(within(profileMenu).getByText(/Timesheets/i)).toBeInTheDocument();
    expect(within(profileMenu).getByText(/Leave Management/i)).toBeInTheDocument();
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
      expect(screen.queryByText(/Profile/i)).toBeNull();
      fireEvent.click(screen.getByText(/Hello, Tester/i));
      expect(screen.getByText(/Profile/i)).toBeInTheDocument();
      expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  describe.each([
    {
      label: 'Donor Management',
      links: [
        { label: 'Donation Log', to: '/donor-management/donation-log' },
        { label: 'Mail Lists', to: '/donor-management' },
        { label: 'Donors', to: '/donor-management/donors' },
      ],
    },
    {
      label: 'Aggregations',
      links: [
        { label: 'Pantry Aggregations', to: '/aggregations/pantry' },
        { label: 'Warehouse Aggregations', to: '/aggregations/warehouse' },
      ],
    },
  ])('navigation groups', ({ label, links }) => {
    it(`renders ${label} submenu links`, () => {
      render(
        <MemoryRouter>
          <Navbar
            groups={[{ label, links }]}
            onLogout={() => {}}
            name="Tester"
          />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: label }));
      links.forEach(({ label: linkLabel }) => {
        expect(screen.getByText(linkLabel)).toBeInTheDocument();
      });
    });
  });
});
