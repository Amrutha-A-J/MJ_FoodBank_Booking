import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageAvailability from '../ManageAvailability';

jest.mock('../../../api/bookings', () => ({
  getAllSlots: jest.fn().mockResolvedValue([]),
  getBreaks: jest.fn().mockResolvedValue([]),
  getRecurringBlockedSlots: jest.fn().mockResolvedValue([]),
  getBlockedSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([{ date: '2024-01-01', reason: 'New Year' }]),
  removeHoliday: jest.fn().mockResolvedValue(undefined),
  addHoliday: jest.fn(),
}));

describe('ManageAvailability', () => {
  it('calls API when removing holiday', async () => {
    const user = userEvent.setup();
    render(<ManageAvailability />);

    const removeButton = await screen.findByLabelText('remove');
    await user.click(removeButton);

    await waitFor(() =>
      expect(require('../../../api/bookings').removeHoliday).toHaveBeenCalledWith(
        '2024-01-01',
      ),
    );
  });
});
