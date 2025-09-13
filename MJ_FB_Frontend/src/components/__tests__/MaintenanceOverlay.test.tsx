import { render, screen } from '@testing-library/react';
import MaintenanceOverlay from '../MaintenanceOverlay';

describe('MaintenanceOverlay', () => {
  it('renders maintenance message', () => {
    render(<MaintenanceOverlay />);
    expect(
      screen.getByText('We are under maintenance. Please check back later.'),
    ).toBeInTheDocument();
  });
});
