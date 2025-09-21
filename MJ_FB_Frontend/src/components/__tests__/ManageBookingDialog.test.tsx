import ManageBookingDialog from '../ManageBookingDialog';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  screen,
  fireEvent,
} from '../../../testUtils/renderWithProviders';
import * as bookingsApi from '../../api/bookings';
import type { Booking } from '../../types';

jest.mock('../../api/bookings', () => ({
  getSlots: jest.fn(),
  rescheduleBookingByToken: jest.fn(),
  cancelBooking: jest.fn(),
  markBookingNoShow: jest.fn(),
}));

describe('ManageBookingDialog', () => {
  const booking: Booking = {
    id: 1,
    status: 'approved',
    date: '2024-01-01',
    slot_id: 1,
    client_id: 1,
    user_name: 'John Doe',
    profile_link: '#',
    visits_this_month: 0,
    approved_bookings_this_month: 0,
    start_time: null,
    end_time: null,
    startTime: null,
    endTime: null,
    newClientId: null,
    reschedule_token: 'token',
  };

  it('shows error message when slot fetch fails', async () => {
    const user = userEvent.setup();
    const getSlotsMock = bookingsApi.getSlots as jest.MockedFunction<
      typeof bookingsApi.getSlots
    >;
    getSlotsMock.mockRejectedValue(new Error('boom'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(
      <ManageBookingDialog
        open
        booking={booking}
        onClose={() => {}}
        onUpdated={() => {}}
      />,
    );

    await user.click(screen.getByLabelText('Status'));
    await user.click(
      await screen.findByRole('option', { name: 'Reschedule' }),
    );
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-01-01' },
    });

    await screen.findByText('Failed to load available slots');
    expect(consoleSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('Time')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    consoleSpy.mockRestore();
    getSlotsMock.mockReset();
  });
});

