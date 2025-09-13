import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import MaintenanceOverlay from '../components/MaintenanceOverlay';
import MaintenanceBanner from '../components/MaintenanceBanner';
import useMaintenance from '../hooks/useMaintenance';
import { getMaintenance } from '../api/maintenance';
import { useAuth } from '../hooks/useAuth';

jest.mock('../api/maintenance', () => ({
  getMaintenance: jest.fn(),
}));

function MaintenanceDisplay() {
  const { maintenanceMode, notice } = useMaintenance();
  return (
    <>
      {maintenanceMode && <MaintenanceOverlay />}
      <MaintenanceBanner notice={notice}>
        <div>child</div>
      </MaintenanceBanner>
    </>
  );
}

describe('MaintenanceDisplay', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders overlay and banner and allows dismiss', async () => {
    (getMaintenance as jest.Mock).mockResolvedValue({ maintenanceMode: true, notice: 'Test notice' });
    renderWithProviders(<MaintenanceDisplay />);
    await waitFor(() =>
      expect(
        screen.getByText('We are under maintenance. Please check back later.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Test notice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Test notice')).not.toBeInTheDocument();
  });

  it('hides overlay and banner when not in maintenance', async () => {
    (getMaintenance as jest.Mock).mockResolvedValue({ maintenanceMode: false, notice: undefined });
    renderWithProviders(<MaintenanceDisplay />);
    await waitFor(() => expect(getMaintenance).toHaveBeenCalled());
    expect(
      screen.queryByText('We are under maintenance. Please check back later.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Test notice')).not.toBeInTheDocument();
  });

  it('does not show overlay on the login page', async () => {
    (getMaintenance as jest.Mock).mockResolvedValue({ maintenanceMode: true, notice: undefined });

    function OverlayWithRoute() {
      const { maintenanceMode } = useMaintenance();
      const { role, access } = useAuth();
      const location = useLocation();
      const isStaff = role === 'staff' || access.includes('admin');
      return (
        <>
          {maintenanceMode && !(isStaff || location.pathname === '/login') && (
            <MaintenanceOverlay />
          )}
        </>
      );
    }

    renderWithProviders(
      <MemoryRouter initialEntries={['/login']}>
        <OverlayWithRoute />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getMaintenance).toHaveBeenCalled());
    expect(
      screen.queryByText('We are under maintenance. Please check back later.'),
    ).not.toBeInTheDocument();
  });
});

