import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RescheduleDialog from '../components/RescheduleDialog';
import { formatTime } from '../utils/time';

jest.mock('../api/bookings', () => ({
  getSlots: jest.fn(),
  rescheduleBookingByToken: jest.fn(),
}));

const { getSlots } = jest.requireMock('../api/bookings');

describe('RescheduleDialog', () => {
  beforeEach(() => {
    (getSlots as jest.Mock).mockReset();
  });

  it('shows only available slots', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '11:00:00', endTime: '11:30:00', available: 0 },
      {
        id: '2',
        startTime: '12:00:00',
        endTime: '12:30:00',
        available: 1,
        status: 'blocked',
      },
      { id: '3', startTime: '13:00:00', endTime: '13:30:00', available: 1 },
      {
        id: '4',
        startTime: '14:00:00',
        endTime: '14:30:00',
        available: 1,
        status: 'break',
      },
    ]);

    render(
      <RescheduleDialog
        open
        rescheduleToken=""
        onClose={() => {}}
        onRescheduled={() => {}}
      />, 
    );

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2099-01-02' },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: /time/i }));
    const options = await screen.findAllByRole('option');
    const expected = formatTime('13:00:00');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(expected);
  });
});
