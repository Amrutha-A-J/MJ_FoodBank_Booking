import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import Maintenance from '../Maintenance';

jest.mock('../../../api/maintenance', () => ({
  getMaintenanceSettings: jest.fn().mockResolvedValue({ maintenanceMode: false, upcomingNotice: '' }),
  updateMaintenanceSettings: jest.fn().mockResolvedValue(undefined),
  clearMaintenanceStats: jest.fn().mockResolvedValue(undefined),
}));

import {
  getMaintenanceSettings,
  updateMaintenanceSettings,
  clearMaintenanceStats,
} from '../../../api/maintenance';

describe('Maintenance', () => {
  it('renders and handles actions', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Maintenance />
      </ThemeProvider>
    );

    const switchEl = await screen.findByRole('checkbox', { name: /maintenance mode/i });
    expect(getMaintenanceSettings).toHaveBeenCalled();
    fireEvent.click(switchEl);
    fireEvent.change(screen.getByLabelText(/upcoming notice/i), { target: { value: 'Soon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateMaintenanceSettings).toHaveBeenCalledWith({ maintenanceMode: true, upcomingNotice: 'Soon' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear Maintenance Stats' }));
    expect(clearMaintenanceStats).toHaveBeenCalled();
  });
});
