import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DonorQuickLinks from '../components/DonorQuickLinks';

describe('DonorQuickLinks', () => {
  it('renders donor links', () => {
    render(
      <MemoryRouter>
        <DonorQuickLinks />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: /Dashboard/i })
    ).toHaveAttribute('href', '/donor-management');
    expect(
      screen.getByRole('link', { name: /Donors/i })
    ).toHaveAttribute('href', '/donor-management/donors');
    expect(
      screen.getByRole('link', { name: /Donor Log/i })
    ).toHaveAttribute('href', '/donor-management/donation-log');
    expect(
      screen.getByRole('link', { name: /Mail Lists/i })
    ).toHaveAttribute('href', '/donor-management/mail-lists');
  });

  it.each([
    ['/donor-management', /Dashboard/i],
    ['/donor-management/donors', /Donors/i],
    ['/donor-management/donors/123', /Donors/i],
    ['/donor-management/donation-log', /Donor Log/i],
    ['/donor-management/mail-lists', /Mail Lists/i],
  ])('disables current page link %s', (path, label) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <DonorQuickLinks />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: label })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('keeps other quick links enabled when viewing dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/donor-management']}>
        <DonorQuickLinks />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Donors/i })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: /Donor Log/i })).not.toHaveAttribute('aria-disabled', 'true');
  });
});

