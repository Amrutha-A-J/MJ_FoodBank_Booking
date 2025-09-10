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
      screen.getByRole('link', { name: /Donor Log/i })
    ).toHaveAttribute('href', '/donor-management/donation-log');
    expect(
      screen.getByRole('link', { name: /Mail Lists/i })
    ).toHaveAttribute('href', '/donor-management/mail-lists');
  });

  it.each([
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
});

