import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WarehouseQuickLinks from '../components/WarehouseQuickLinks';

describe('WarehouseQuickLinks', () => {
  it('renders links to warehouse routes', () => {
    render(
      <MemoryRouter>
        <WarehouseQuickLinks />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute(
      'href',
      '/warehouse-management',
    );
    expect(screen.getByRole('link', { name: /Donation Log/i })).toHaveAttribute(
      'href',
      '/warehouse-management/donation-log',
    );
    expect(screen.getByRole('link', { name: /Track Surplus/i })).toHaveAttribute(
      'href',
      '/warehouse-management/track-surplus',
    );
    expect(screen.getByRole('link', { name: /Track Pigpound/i })).toHaveAttribute(
      'href',
      '/warehouse-management/track-pigpound',
    );
    expect(
      screen.getByRole('link', { name: /Track Outgoing Donations/i }),
    ).toHaveAttribute('href', '/warehouse-management/track-outgoing-donations');
    expect(screen.getByRole('link', { name: /Aggregations/i })).toHaveAttribute(
      'href',
      '/warehouse-management/aggregations',
    );
    expect(screen.getByRole('link', { name: /Exports/i })).toHaveAttribute(
      'href',
      '/warehouse-management/exports',
    );
  });
});

