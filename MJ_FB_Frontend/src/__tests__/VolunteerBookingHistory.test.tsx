import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import VolunteerBookingHistory from '../pages/volunteer-management/VolunteerBookingHistory';
import { formatTime } from '../utils/time';
import {
  getMyVolunteerBookings,
  getVolunteerRolesForVolunteer,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  ...jest.requireActual('../api/volunteers'),
  getMyVolunteerBookings: jest.fn(),
  getVolunteerRolesForVolunteer: jest.fn(),
}));

const { getMyVolunteerBookings, getVolunteerRolesForVolunteer } = jest.requireMock('../api/volunteers');

describe('VolunteerBookingHistory', () => {
  beforeEach(() => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        role_name: 'Pantry',
        volunteer_id: 1,
        date: '2024-02-01',
        start_time: '09:00:00',
        end_time: '12:00:00',
        status: 'approved',
        reschedule_token: 'abc',
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 10,
        role_id: 1,
        name: 'Pantry',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 5,
        booked: 5,
        available: 0,
        status: 'open',
        date: '2024-02-02',
        category_id: 1,
        category_name: 'Pantry',
        is_wednesday_slot: false,
      },
      {
        id: 11,
        role_id: 1,
        name: 'Pantry',
        start_time: '13:00:00',
        end_time: '16:00:00',
        max_volunteers: 5,
        booked: 3,
        available: 2,
        status: 'open',
        date: '2024-02-02',
        category_id: 1,
        category_name: 'Pantry',
        is_wednesday_slot: false,
      },
    ]);
  });

  it('lists only available shifts when rescheduling', async () => {
    renderWithProviders(<VolunteerBookingHistory />);

    fireEvent.click(await screen.findByText(/reschedule/i));
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
