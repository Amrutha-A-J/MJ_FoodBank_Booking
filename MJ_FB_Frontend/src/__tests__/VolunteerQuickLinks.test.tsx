import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerQuickLinks from '../components/VolunteerQuickLinks';

describe('VolunteerQuickLinks', () => {
  it('renders volunteer management links', () => {
    render(
      <MemoryRouter>
        <VolunteerQuickLinks />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Search Volunteer/i })).toHaveAttribute(
      'href',
      '/volunteer-management/volunteers',
    );
    expect(screen.getByRole('link', { name: /Volunteer Schedule/i })).toHaveAttribute(
      'href',
      '/volunteer-management/schedule',
    );
    expect(screen.getByRole('link', { name: /Daily Bookings/i })).toHaveAttribute(
      'href',
      '/volunteer-management/daily',
    );
  });

  it('keeps links enabled on the current page', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer-management/volunteers']}>
        <VolunteerQuickLinks />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /Search Volunteer/i }),
    ).not.toHaveAttribute('aria-disabled');
  });
});
