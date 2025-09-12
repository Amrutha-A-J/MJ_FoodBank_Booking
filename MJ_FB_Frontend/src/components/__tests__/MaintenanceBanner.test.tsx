import MaintenanceBanner from '../MaintenanceBanner';
import { renderWithProviders, screen, fireEvent } from '../../../testUtils/renderWithProviders';

describe('MaintenanceBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders notice and dismisses', () => {
    renderWithProviders(<MaintenanceBanner notice="Test notice" />);
    expect(screen.getByText('Test notice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Test notice')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('maintenanceBannerDismissed')).toBe('true');
  });
});
