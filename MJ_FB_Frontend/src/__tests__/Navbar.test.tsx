import { render, screen, fireEvent } from '@testing-library/react';
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

  it('shows staff profile links only in the profile menu', () => {
    render(
      <MemoryRouter>
        <Navbar
          groups={[{ label: 'Home', links: [{ label: 'Home', to: '/' }] }]}
          onLogout={() => {}}
          name="Tester"
          role="staff"
          profileLinks={[
            { label: 'Timesheets', to: '/timesheet' },
            { label: 'Leave Management', to: '/leave-requests' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Timesheets/i)).toBeNull();
    expect(screen.queryByText(/Leave Management/i)).toBeNull();
    fireEvent.click(screen.getByText(/Hello, Tester/i));
    expect(screen.getByText(/Timesheets/i)).toBeInTheDocument();
    expect(screen.getByText(/Leave Management/i)).toBeInTheDocument();
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
