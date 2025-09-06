import { screen, fireEvent } from '@testing-library/react';
import VolunteerSchedule from '../pages/volunteer-management/VolunteerSchedule';
import i18n from '../i18n';
import { formatTime } from '../utils/time';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-29T19:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.useFakeTimers();
    jest.setSystemTime(new Date());
    jest.useRealTimers();
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

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText(i18n.t('role')));
    fireEvent.click(await screen.findByText('Greeter'));

    const prev = await screen.findByRole('button', { name: i18n.t('previous') });
    expect(prev).toBeDisabled();

    expect(await screen.findByText(i18n.t('no_bookings'))).toBeInTheDocument();
  });

  it('shows only available shifts in reschedule dialog', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        role_name: 'Pantry',
        volunteer_id: 1,
        date: '2024-01-29',
        start_time: '09:00:00',
        end_time: '12:00:00',
        status: 'approved',
        reschedule_token: 'abc',
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockImplementation((date: string) => {
      if (date === '2024-01-29') {
        return Promise.resolve([
          {
            id: 1,
            role_id: 1,
            name: 'Pantry',
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 1,
            booked: 1,
            available: 0,
            status: 'open',
            date,
            category_id: 1,
            category_name: 'Pantry',
            is_wednesday_slot: false,
          },
        ]);
      }
      if (date === '2024-02-02') {
        return Promise.resolve([
          {
            id: 2,
            role_id: 1,
            name: 'Pantry',
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 1,
            booked: 1,
            available: 0,
            status: 'open',
            date,
            category_id: 1,
            category_name: 'Pantry',
            is_wednesday_slot: false,
          },
          {
            id: 3,
            role_id: 1,
            name: 'Pantry',
            start_time: '13:00:00',
            end_time: '16:00:00',
            max_volunteers: 2,
            booked: 0,
            available: 2,
            status: 'open',
            date,
            category_id: 1,
            category_name: 'Pantry',
            is_wednesday_slot: false,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<VolunteerSchedule />);

    fireEvent.mouseDown(screen.getByLabelText(i18n.t('role')));
    fireEvent.click(await screen.findByText('Pantry'));

    fireEvent.click(await screen.findByText('My Booking'));
    fireEvent.click(screen.getByRole('button', { name: /reschedule/i }));

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-02-02' },
    });

    fireEvent.mouseDown(await screen.findByLabelText(/role/i));

    const availableLabel = `Pantry ${formatTime('13:00:00')}–${formatTime('16:00:00')}`;
    expect(screen.getByText(availableLabel)).toBeInTheDocument();
    expect(
      screen.queryByText(
        `Pantry ${formatTime('09:00:00')}–${formatTime('12:00:00')}`,
      ),
    ).toBeNull();
  });
});
