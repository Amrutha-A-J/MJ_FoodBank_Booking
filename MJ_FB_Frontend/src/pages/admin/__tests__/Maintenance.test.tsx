import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import Maintenance from '../Maintenance';

jest.mock('../../../api/maintenance', () => ({
  getMaintenanceSettings: jest.fn().mockResolvedValue({ maintenanceMode: false, upcomingNotice: '' }),
  updateMaintenanceSettings: jest.fn().mockResolvedValue(undefined),
  clearMaintenanceStats: jest.fn().mockResolvedValue(undefined),
  vacuumDatabase: jest.fn().mockResolvedValue({ message: 'Vacuum started' }),
  vacuumTable: jest.fn().mockResolvedValue({ message: 'Table vacuum started' }),
  getVacuumDeadRows: jest.fn().mockResolvedValue({ message: 'Dead rows fetched' }),
}));

import {
  getMaintenanceSettings,
  updateMaintenanceSettings,
  clearMaintenanceStats,
  vacuumDatabase,
  vacuumTable,
  getVacuumDeadRows,
} from '../../../api/maintenance';

describe('Maintenance', () => {
  it('renders and handles actions', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Maintenance />
      </ThemeProvider>
    );

    await waitFor(() => expect(getMaintenanceSettings).toHaveBeenCalled());
    const switchEl = screen.getByRole('switch', { name: /maintenance mode/i });
    fireEvent.click(switchEl);
    fireEvent.change(screen.getByLabelText(/upcoming notice/i), { target: { value: 'Soon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateMaintenanceSettings).toHaveBeenCalledWith({
        maintenanceMode: true,
        upcomingNotice: 'Soon',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear Maintenance Stats' }));
    await waitFor(() => expect(clearMaintenanceStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /vacuum/i }));

    fireEvent.click(screen.getByRole('button', { name: /vacuum database/i }));
    await waitFor(() => expect(vacuumDatabase).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/table name/i), { target: { value: 'users' } });
    fireEvent.click(screen.getByRole('button', { name: /vacuum table/i }));
    await waitFor(() => expect(vacuumTable).toHaveBeenCalledWith('users'));

    fireEvent.change(screen.getByLabelText(/table filter/i), { target: { value: 'orders' } });
    fireEvent.click(screen.getByRole('button', { name: /check dead rows/i }));
    await waitFor(() => expect(getVacuumDeadRows).toHaveBeenCalledWith('orders'));
  });
});
