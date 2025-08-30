import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageAvailability from '../ManageAvailability';
import { removeHoliday } from '../../../api/bookings';

jest.mock('../../../api/slots', () => ({
  getAllSlots: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../api/bookings', () => ({
  getBreaks: jest.fn().mockResolvedValue([]),
  getRecurringBlockedSlots: jest.fn().mockResolvedValue([]),
  getBlockedSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([
    { date: '2024-01-01', reason: 'Holiday' },
  ]),
  addHoliday: jest.fn(),
  removeHoliday: jest.fn(),
  addBlockedSlot: jest.fn(),
  addRecurringBlockedSlot: jest.fn(),
  removeBlockedSlot: jest.fn(),
  removeRecurringBlockedSlot: jest.fn(),
  addBreak: jest.fn(),
  removeBreak: jest.fn(),
}));

describe('ManageAvailability', () => {
  it('calls API when removing a holiday', async () => {
    render(<ManageAvailability />);

    const removeBtn = await screen.findByLabelText('remove');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(removeHoliday).toHaveBeenCalledWith('2024-01-01');
    });
  });
});
