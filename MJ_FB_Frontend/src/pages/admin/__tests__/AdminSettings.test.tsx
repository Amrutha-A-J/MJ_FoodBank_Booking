import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import AdminSettings from '../AdminSettings';

jest.mock('../settings/WarehouseSettings', () => () => <div>Warehouse Content</div>);
jest.mock('../settings/PantrySettingsTab', () => () => <div>Pantry Content</div>);
jest.mock('../settings/DeliverySettingsTab', () => () => <div>Delivery Content</div>);
jest.mock('../settings/VolunteerSettingsTab', () => () => <div>Volunteer Content</div>);
jest.mock('../settings/DonorSettingsTab', () => () => <div>Donor Content</div>);

describe('AdminSettings', () => {
  it('renders tabs and switches content', () => {
    render(
      <ThemeProvider theme={theme}>
        <AdminSettings />
      </ThemeProvider>
    );

    expect(screen.getByText('Warehouse Content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Pantry' }));
    expect(screen.getByText('Pantry Content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Delivery' }));
    expect(screen.getByText('Delivery Content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Volunteer' }));
    expect(screen.getByText('Volunteer Content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Donor' }));
    expect(screen.getByText('Donor Content')).toBeInTheDocument();
  });
});
