import ManageBookingDialog from '../ManageBookingDialog';
import { renderWithProviders, screen, fireEvent } from '../../../testUtils/renderWithProviders';
import * as bookingsApi from '../../api/bookings';
import type { Booking } from '../../types';

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
    const getSlotsSpy = jest
      .spyOn(bookingsApi, 'getSlots')
      .mockRejectedValue(new Error('boom'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(
      <ManageBookingDialog
        open
        booking={booking}
        onClose={() => {}}
        onUpdated={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'reschedule' },
    });
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-01-01' },
    });

    await screen.findByText('Failed to load available slots');
    expect(consoleSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('Time')).toBeDisabled();

    consoleSpy.mockRestore();
    getSlotsSpy.mockRestore();
  });
});

