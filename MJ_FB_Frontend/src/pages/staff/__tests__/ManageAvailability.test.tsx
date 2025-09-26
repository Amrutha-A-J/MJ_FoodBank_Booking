import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageAvailability from '../ManageAvailability';
import {
  removeHoliday,
  removeBlockedSlot,
  removeBreak,
  getBlockedSlots,
  getBreaks,
  getHolidays,
} from '../../../api/bookings';
import { useAuth } from '../../../hooks/useAuth';

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

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

beforeEach(() => {
  jest.clearAllMocks();
  (getHolidays as jest.Mock).mockResolvedValue([]);
  (getBreaks as jest.Mock).mockResolvedValue([]);
  (getBlockedSlots as jest.Mock).mockResolvedValue([]);
  mockUseAuth.mockReturnValue({
    access: ['pantry'],
  } as unknown as ReturnType<typeof useAuth>);
});

describe('ManageAvailability', () => {
  it('confirms before removing a holiday', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([{ date: '2024-01-01', reason: 'Holiday' }]);
    const user = userEvent.setup();
    render(<ManageAvailability />);

    const holidayPanel = screen.getByRole('tabpanel', { name: /holidays/i });
    const [removeBtn] = await within(holidayPanel).findAllByLabelText('remove');
    await user.click(removeBtn);

    expect(await screen.findByText('Remove holiday?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(removeHoliday).toHaveBeenCalledWith('2024-01-01');
    });
  });

  it('confirms before removing a blocked slot', async () => {
    (getBlockedSlots as jest.Mock).mockResolvedValue([
      { date: '2024-02-01', slotId: 1, reason: '' },
    ]);
    const user = userEvent.setup();
    render(<ManageAvailability />);

    await user.click(screen.getByRole('tab', { name: /blocked slots/i }));
    const blockedPanel = screen.getByRole('tabpanel', { name: /blocked slots/i });
    const [removeBtn] = await within(blockedPanel).findAllByLabelText('remove');
    await user.click(removeBtn);

    expect(await screen.findByText('Remove blocked slot?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(removeBlockedSlot).toHaveBeenCalledWith('2024-02-01', 1);
    });
  });

  it('confirms before removing a break', async () => {
    (getBreaks as jest.Mock).mockResolvedValue([
      { dayOfWeek: 0, slotId: 1, reason: '' },
    ]);
    const user = userEvent.setup();
    render(<ManageAvailability />);

    await user.click(screen.getByRole('tab', { name: /staff breaks/i }));
    const breaksPanel = screen.getByRole('tabpanel', { name: /staff breaks/i });
    const [removeBtn] = await within(breaksPanel).findAllByLabelText('remove');
    await user.click(removeBtn);

    expect(await screen.findByText('Remove break?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(removeBreak).toHaveBeenCalledWith(0, 1);
    });
  });

  it('hides pantry quick links when staff lacks pantry access', () => {
    mockUseAuth.mockReturnValue({
      access: [],
    } as unknown as ReturnType<typeof useAuth>);

    render(<ManageAvailability />);

    expect(screen.queryByRole('button', { name: /pantry schedule/i })).not.toBeInTheDocument();
  });
});
