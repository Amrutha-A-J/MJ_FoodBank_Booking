import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PantrySettings from '../PantrySettings';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';

type Slot = { maxCapacity: number };

jest.mock('../../../api/slots', () => ({
  getAllSlots: jest.fn(),
  updateSlotCapacity: jest.fn(),
}));

jest.mock('../../../api/appConfig', () => ({
  getAppConfig: jest.fn(),
  updateAppConfig: jest.fn(),
}));

const { getAllSlots, updateSlotCapacity } = jest.requireMock('../../../api/slots');
const { getAppConfig, updateAppConfig } = jest.requireMock('../../../api/appConfig');

describe('PantrySettings', () => {
  it('updates capacity and cart tare', async () => {
    (getAllSlots as jest.Mock).mockResolvedValue<Slot[]>([{ maxCapacity: 5 }]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 10 });

    render(
      <ThemeProvider theme={theme}>
        <PantrySettings />
      </ThemeProvider>,
    );

    const capacityField = await screen.findByLabelText('Max bookings per slot');
    const tareField = await screen.findByLabelText('Cart Tare (lbs)');
    expect(capacityField).toHaveValue(5);
    expect(tareField).toHaveValue(10);

    fireEvent.change(tareField, { target: { value: '15' } });
    const [saveCapacity, saveTare] = screen.getAllByText('Save');
    fireEvent.click(saveTare);
    expect(updateAppConfig).toHaveBeenCalledWith({ cartTare: 15 });

    fireEvent.change(capacityField, { target: { value: '7' } });
    fireEvent.click(saveCapacity);
    expect(updateSlotCapacity).toHaveBeenCalledWith(7);
  });
});
