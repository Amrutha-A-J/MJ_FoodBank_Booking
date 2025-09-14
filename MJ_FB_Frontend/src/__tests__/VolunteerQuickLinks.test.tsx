import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VolunteerQuickLinks from '../components/VolunteerQuickLinks';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('VolunteerQuickLinks', () => {
  afterEach(() => {
    mockNavigate.mockReset();
  });

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
    expect(screen.getByRole('link', { name: /Ranking/i })).toHaveAttribute(
      'href',
      '/volunteer-management/volunteers?tab=ranking',
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

  it('does not reload when switching tabs', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/volunteer-management/volunteers?tab=ranking']}>
        <VolunteerQuickLinks />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /Search Volunteer/i }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
