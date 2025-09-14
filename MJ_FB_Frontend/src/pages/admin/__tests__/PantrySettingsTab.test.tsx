import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
  waitFor,
} from '../../../../testUtils/renderWithProviders';
import '@testing-library/jest-dom';
import PantrySettingsTab from '../settings/PantrySettingsTab';
import type { Slot } from '../../../types';

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

describe('PantrySettingsTab', () => {
  it('updates capacity and cart tare', async () => {
    const slots: Slot[] = [
      { id: '1', startTime: '09:00', endTime: '10:00', maxCapacity: 5 },
    ];
    (getAllSlots as jest.Mock).mockResolvedValue(slots);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 10 });

    renderWithProviders(<PantrySettingsTab />);

    const capacityField = await screen.findByLabelText('Max bookings per slot');
    const tareField = await screen.findByLabelText('Cart Tare (lbs)');
    expect(capacityField).toHaveValue(5);
    expect(tareField).toHaveValue(10);

    fireEvent.change(tareField, { target: { value: '15' } });
    const [saveCapacity, saveTare] = screen.getAllByText('Save');
    await act(async () => {
      fireEvent.click(saveTare);
    });
    await waitFor(() => expect(updateAppConfig).toHaveBeenCalled());
    expect(updateAppConfig).toHaveBeenCalledWith({ cartTare: 15 });

    fireEvent.change(capacityField, { target: { value: '7' } });
    await act(async () => {
      fireEvent.click(saveCapacity);
    });
    expect(updateSlotCapacity).toHaveBeenCalledWith(7);
  });
});
