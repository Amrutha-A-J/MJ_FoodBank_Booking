import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import AdminSettings from '../AdminSettings';

jest.mock('../settings/WarehouseSettings', () => () => <div>Warehouse Content</div>);
jest.mock('../settings/PantrySettings', () => () => <div>Pantry Content</div>);
jest.mock('../settings/VolunteerSettings', () => () => <div>Volunteer Content</div>);

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
    fireEvent.click(screen.getByRole('tab', { name: 'Volunteer' }));
    expect(screen.getByText('Volunteer Content')).toBeInTheDocument();
  });
});
