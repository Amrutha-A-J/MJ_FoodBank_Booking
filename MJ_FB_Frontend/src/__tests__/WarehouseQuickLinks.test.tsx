import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WarehouseQuickLinks from '../components/WarehouseQuickLinks';

describe('WarehouseQuickLinks', () => {
  it('renders warehouse tracking links only', () => {
    render(
      <MemoryRouter>
        <WarehouseQuickLinks />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Track Donation/i })).toHaveAttribute(
      'href',
      '/warehouse-management/donation-log',
    );
    expect(
      screen.getByRole('link', { name: /Track Pig Pounds/i }),
    ).toHaveAttribute('href', '/warehouse-management/track-pigpound');
    expect(screen.getByRole('link', { name: /Track Outgoing/i })).toHaveAttribute(
      'href',
      '/warehouse-management/track-outgoing-donations',
    );
    expect(screen.getByRole('link', { name: /Track Surplus/i })).toHaveAttribute(
      'href',
      '/warehouse-management/track-surplus',
    );
    expect(screen.queryByRole('link', { name: /Dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Aggregations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Exports/i })).not.toBeInTheDocument();
  });
});

