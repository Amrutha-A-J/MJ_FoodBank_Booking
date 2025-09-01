import { render, screen, fireEvent } from '@testing-library/react';
import VolunteerSchedule from '../pages/volunteer-management/VolunteerSchedule';
import i18n from '../i18n';
import {
  getVolunteerRolesForVolunteer,
  getMyVolunteerBookings,
  requestVolunteerBooking,
  createRecurringVolunteerBooking,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
  resolveVolunteerBookingConflict,
} from '../api/volunteers';
import { getHolidays } from '../api/bookings';

jest.mock('../api/volunteers', () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  getMyVolunteerBookings: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  createRecurringVolunteerBooking: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
  rescheduleVolunteerBookingByToken: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
}));

jest.mock('../api/bookings', () => ({ getHolidays: jest.fn() }));

describe('VolunteerSchedule', () => {
  beforeEach(() => {
    jest.setSystemTime(new Date('2024-01-29T19:00:00Z'));
  });

  afterEach(() => {
    jest.setSystemTime(new Date());
  });

  it('disables past days and hides past slots', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '9:00:00',
        end_time: '12:00:00',
        max_volunteers: 1,
        booked: 0,
        available: 1,
        status: 'available',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);

    render(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText(i18n.t('role')));
    fireEvent.click(await screen.findByText('Greeter'));

    const prev = await screen.findByRole('button', { name: i18n.t('previous') });
    expect(prev).toBeDisabled();

    expect(await screen.findByText(i18n.t('no_bookings'))).toBeInTheDocument();
  });
});
