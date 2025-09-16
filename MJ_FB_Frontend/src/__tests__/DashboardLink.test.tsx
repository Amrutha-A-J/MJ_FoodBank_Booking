import { render, screen } from '@testing-library/react';
import Navbar, { type NavGroup } from '../components/Navbar';
import { MemoryRouter } from 'react-router-dom';

describe('Dashboard link', () => {
  function renderNavbar(groups: NavGroup[]) {
    render(
      <MemoryRouter>
        <Navbar groups={groups} onLogout={() => {}} />
      </MemoryRouter>,
    );
  }

  it('appears for clients', () => {
    renderNavbar([{ label: 'Booking', links: [{ label: 'Dashboard', to: '/' }] }]);
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
  });

  it('appears for volunteers', () => {
    renderNavbar([{ label: 'Volunteer', links: [{ label: 'Dashboard', to: '/' }] }]);
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
  });

  it('appears for delivery users', () => {
    renderNavbar([{ label: 'Delivery', links: [{ label: 'Dashboard', to: '/' }] }]);
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
  });
});
