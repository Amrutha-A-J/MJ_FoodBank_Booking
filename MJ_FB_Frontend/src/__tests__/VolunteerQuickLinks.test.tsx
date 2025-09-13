import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Router from 'react-router-dom';
import VolunteerQuickLinks from '../components/VolunteerQuickLinks';

describe('VolunteerQuickLinks', () => {
  it('renders volunteer management links', () => {
    render(
      <Router.MemoryRouter>
        <VolunteerQuickLinks />
      </Router.MemoryRouter>
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
    expect(screen.getByRole('link', { name: /Ranking/i })).toHaveAttribute(
      'href',
      '/volunteer-management/volunteers?tab=ranking',
    );
  });

  it('keeps links enabled on the current page', () => {
    render(
      <Router.MemoryRouter initialEntries={['/volunteer-management/volunteers']}>
        <VolunteerQuickLinks />
      </Router.MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /Search Volunteer/i }),
    ).not.toHaveAttribute('aria-disabled');
  });

  it('does not reload when switching tabs', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    const spy = jest
      .spyOn(Router, 'useNavigate')
      .mockReturnValue(navigate);

    render(
      <Router.MemoryRouter initialEntries={['/volunteer-management/volunteers?tab=ranking']}>
        <VolunteerQuickLinks />
      </Router.MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /Search Volunteer/i }));
    expect(navigate).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
