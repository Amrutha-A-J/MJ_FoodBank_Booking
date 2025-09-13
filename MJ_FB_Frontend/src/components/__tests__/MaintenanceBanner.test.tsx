import { render, screen, fireEvent } from '@testing-library/react';
import MaintenanceBanner from '../MaintenanceBanner';

describe('MaintenanceBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows notice and dismisses', () => {
    render(
      <MaintenanceBanner notice="Test notice">
        <div>child</div>
      </MaintenanceBanner>,
    );
    expect(screen.getByText('Test notice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(sessionStorage.getItem('maintenance-banner-dismissed')).toBe('true');
    expect(screen.queryByText('Test notice')).not.toBeInTheDocument();
  });

  it('hides when dismissed in sessionStorage', () => {
    sessionStorage.setItem('maintenance-banner-dismissed', 'true');
    render(
      <MaintenanceBanner notice="Test notice">
        <div>child</div>
      </MaintenanceBanner>,
    );
    expect(screen.queryByText('Test notice')).not.toBeInTheDocument();
  });
});
