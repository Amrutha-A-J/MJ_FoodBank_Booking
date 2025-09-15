import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import PantrySettingsTab from '../settings/PantrySettingsTab';
import { theme } from '../../../theme';

jest.mock('../../../hooks/useAppConfig', () => ({
  __esModule: true,
  default: () => ({
    appConfig: { cartTare: 15 },
    error: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../api/slots', () => ({
  getAllSlots: jest.fn(),
  updateSlotCapacity: jest.fn(),
}));

jest.mock('../../../api/appConfig', () => ({
  updateAppConfig: jest.fn(),
}));

const { getAllSlots, updateSlotCapacity } = jest.requireMock('../../../api/slots');
const { updateAppConfig } = jest.requireMock('../../../api/appConfig');

function renderComponent() {
  return render(
    <ThemeProvider theme={theme}>
      <PantrySettingsTab />
    </ThemeProvider>,
  );
}

describe('PantrySettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAllSlots as jest.Mock).mockResolvedValue([{ maxCapacity: 5 }]);
  });

  it('saves updated capacity', async () => {
    renderComponent();
    const input = await screen.findByLabelText(/max bookings per slot/i);
    fireEvent.change(input, { target: { value: '10' } });
    const buttons = screen.getAllByRole('button', { name: /^save$/i });
    fireEvent.click(buttons[0]);
    await waitFor(() => {
      expect(updateSlotCapacity).toHaveBeenCalledWith(10);
    });
  });

  it('saves updated cart tare', async () => {
    renderComponent();
    const input = await screen.findByLabelText(/cart tare \(lbs\)/i);
    fireEvent.change(input, { target: { value: '20' } });
    const buttons = screen.getAllByRole('button', { name: /^save$/i });
    fireEvent.click(buttons[1]);
    await waitFor(() => {
      expect(updateAppConfig).toHaveBeenCalledWith({ cartTare: 20 });
    });
  });
});
