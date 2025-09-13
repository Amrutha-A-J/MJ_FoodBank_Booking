import { render, screen } from '@testing-library/react';
import MaintenanceOverlay from '../MaintenanceOverlay';

describe('MaintenanceOverlay', () => {
  it('renders maintenance message and logo', () => {
    render(<MaintenanceOverlay />);
    expect(screen.getByAltText('Food Bank logo')).toBeInTheDocument();
    expect(
      screen.getByText('We are under maintenance. Please check back later.'),
    ).toBeInTheDocument();
  });
});
