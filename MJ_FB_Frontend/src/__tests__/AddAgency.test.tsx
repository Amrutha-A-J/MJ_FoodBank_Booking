import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';
import AddAgency from '../pages/staff/AddAgency';
import * as agenciesApi from '../api/agencies';

jest.mock('../api/agencies');

describe('AddAgency page', () => {
  it('submits agency data', async () => {
    (agenciesApi.createAgency as jest.Mock).mockResolvedValue({});
    render(
      <ThemeProvider theme={theme}>
        <AddAgency />
      </ThemeProvider>
    );
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Passw0rd!' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Agency/i }));
    await waitFor(() => expect(agenciesApi.createAgency).toHaveBeenCalled());
  });
});
