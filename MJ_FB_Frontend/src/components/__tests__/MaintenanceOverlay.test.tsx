import en from '../../../public/locales/en/translation.json';
import MaintenanceOverlay from '../MaintenanceOverlay';
import { renderWithProviders, screen } from '../../../testUtils/renderWithProviders';

describe('MaintenanceOverlay', () => {
  it('renders maintenance message', () => {
    renderWithProviders(<MaintenanceOverlay />);
    expect(screen.getByText(en.maintenance_message)).toBeInTheDocument();
  });
});
