import { screen, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PantryQuickLinks from '../components/PantryQuickLinks';

describe('PantryQuickLinks', () => {
  it('renders pantry links only', () => {
    render(
      <MemoryRouter>
        <PantryQuickLinks />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Pantry Schedule/i })).toHaveAttribute(
      'href',
      '/pantry/schedule',
    );
    expect(screen.getByRole('link', { name: /Record a Visit/i })).toHaveAttribute(
      'href',
      '/pantry/visits',
    );
    expect(screen.getByRole('link', { name: /Search Client/i })).toHaveAttribute(
      'href',
      '/pantry/client-management',
    );
    expect(
      screen.queryByRole('link', { name: /Aggregations/i }),
    ).not.toBeInTheDocument();
  });
});
