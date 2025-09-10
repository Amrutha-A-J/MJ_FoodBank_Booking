import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageAvailability from '../ManageAvailability';
import {
  removeHoliday,
  removeBlockedSlot,
  removeBreak,
  getBlockedSlots,
  getBreaks,
  getHolidays,
} from '../../../api/bookings';

jest.mock('../../../api/slots', () => ({
  getAllSlots: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../api/bookings', () => ({
  getBreaks: jest.fn(),
  getRecurringBlockedSlots: jest.fn().mockResolvedValue([]),
  getBlockedSlots: jest.fn(),
  getHolidays: jest.fn(),
  addHoliday: jest.fn(),
  removeHoliday: jest.fn(),
  addBlockedSlot: jest.fn(),
  addRecurringBlockedSlot: jest.fn(),
  removeBlockedSlot: jest.fn(),
  removeRecurringBlockedSlot: jest.fn(),
  addBreak: jest.fn(),
  removeBreak: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getHolidays as jest.Mock).mockResolvedValue([]);
  (getBreaks as jest.Mock).mockResolvedValue([]);
  (getBlockedSlots as jest.Mock).mockResolvedValue([]);
});

describe('ManageAvailability', () => {
  it('confirms before removing a holiday', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([{ date: '2024-01-01', reason: 'Holiday' }]);
    render(<ManageAvailability />);

    const removeBtn = await screen.findByLabelText('remove');
    fireEvent.click(removeBtn);

    expect(await screen.findByText('Remove holiday?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(removeHoliday).toHaveBeenCalledWith('2024-01-01');
    });
  });

  it('confirms before removing a blocked slot', async () => {
    (getBlockedSlots as jest.Mock).mockResolvedValue([
      { date: '2024-02-01', slotId: 1, reason: '' },
    ]);
    render(<ManageAvailability />);

    fireEvent.click(screen.getByRole('tab', { name: /blocked slots/i }));
    const removeBtn = await screen.findByLabelText('remove');
    fireEvent.click(removeBtn);

    expect(await screen.findByText('Remove blocked slot?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(removeBlockedSlot).toHaveBeenCalledWith('2024-02-01', 1);
    });
  });

  it('confirms before removing a break', async () => {
    (getBreaks as jest.Mock).mockResolvedValue([
      { dayOfWeek: 0, slotId: 1, reason: '' },
    ]);
    render(<ManageAvailability />);

    fireEvent.click(screen.getByRole('tab', { name: /staff breaks/i }));
    const removeBtn = await screen.findByLabelText('remove');
    fireEvent.click(removeBtn);

    expect(await screen.findByText('Remove break?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(removeBreak).toHaveBeenCalledWith(0, 1);
    });
  });
});
