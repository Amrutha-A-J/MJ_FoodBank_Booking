import { render, screen, fireEvent, within } from '@testing-library/react';
import PantrySchedule from '../PantrySchedule';
import * as bookingApi from '../../../api/bookings';

jest.mock('../../../api/bookings', () => ({
  getSlots: jest.fn(),
  getBookings: jest.fn(),
  getHolidays: jest.fn(),
  createBookingForUser: jest.fn(),
  createBookingForNewClient: jest.fn(),
}));

describe('PantrySchedule new client workflow', () => {
  beforeEach(() => {
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1, maxCapacity: 1 },
    ]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  it('shows new client label', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-01',
        slot_id: 1,
        user_name: 'New Person',
        user_id: null,
        client_id: null,
        newClientId: 2,
        visits_this_month: 0,
        approved_bookings_this_month: 0,
        is_staff_booking: false,
        reschedule_token: '',
        profile_link: '',
      },
    ]);
    render(<PantrySchedule />);
    expect(await screen.findByText('[NEW CLIENT] New Person')).toBeInTheDocument();
  });

  it('creates booking for new client', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    render(<PantrySchedule searchUsersFn={jest.fn()} />);

    const rows = await screen.findAllByRole('row');
    const cells = within(rows[1]).getAllByRole('cell');
    fireEvent.click(cells[1]);

    fireEvent.click(screen.getByLabelText('New client'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    expect(bookingApi.createBookingForNewClient).toHaveBeenCalledWith(
      'Test User',
      1,
      expect.any(String),
      undefined,
      undefined,
    );
  });
});
