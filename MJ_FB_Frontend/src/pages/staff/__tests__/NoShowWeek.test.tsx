import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NoShowWeek from '../client-management/NoShowWeek';
import { getBookings } from '../../../api/bookings';

jest.mock('../../../api/bookings', () => ({
  getBookings: jest.fn(),
}));

describe('NoShowWeek', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00'));
    (getBookings as jest.Mock).mockImplementation(({ date }) => {
      if (date === '2024-01-01') {
        return Promise.resolve([
          {
            id: 1,
            status: 'no_show',
            date,
            slot_id: 1,
            user_name: 'No Show',
            user_id: 1,
            client_id: 1,
            visits_this_month: 0,
            approved_bookings_this_month: 0,
            is_staff_booking: false,
            reschedule_token: 't1',
            profile_link: '',
            start_time: '09:00:00',
          },
          {
            id: 2,
            status: 'approved',
            date,
            slot_id: 1,
            user_name: 'Approved Past',
            user_id: 1,
            client_id: 1,
            visits_this_month: 0,
            approved_bookings_this_month: 0,
            is_staff_booking: false,
            reschedule_token: 't2',
            profile_link: '',
            start_time: '08:00:00',
          },
          {
            id: 3,
            status: 'approved',
            date,
            slot_id: 1,
            user_name: 'Approved Future',
            user_id: 1,
            client_id: 1,
            visits_this_month: 0,
            approved_bookings_this_month: 0,
            is_staff_booking: false,
            reschedule_token: 't3',
            profile_link: '',
            start_time: '23:59:00',
          },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    (getBookings as jest.Mock).mockReset();
  });

  it('filters today bookings by status', async () => {
    render(
      <MemoryRouter>
        <NoShowWeek />
      </MemoryRouter>,
    );

    const table = await screen.findByTestId('today-bookings');

    expect(within(table).getByText('No Show')).toBeInTheDocument();
    expect(within(table).getByText('Approved Past')).toBeInTheDocument();
    expect(within(table).queryByText('Approved Future')).not.toBeInTheDocument();

    const filter = screen.getByLabelText('Status');
    fireEvent.mouseDown(filter);
    let listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText(/Approved/i));

    expect(within(table).queryByText('No Show')).not.toBeInTheDocument();
    expect(within(table).getByText('Approved Past')).toBeInTheDocument();

    fireEvent.mouseDown(filter);
    listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText(/No Show/i));

    expect(within(table).getByText('No Show')).toBeInTheDocument();
    expect(within(table).queryByText('Approved Past')).not.toBeInTheDocument();
  });

  it('shows full dates for each day', () => {
    render(
      <MemoryRouter>
        <NoShowWeek />
      </MemoryRouter>,
    );

    const dates = [
      'Sunday, Dec 31, 2023',
      'Monday, Jan 1, 2024',
      'Tuesday, Jan 2, 2024',
      'Wednesday, Jan 3, 2024',
      'Thursday, Jan 4, 2024',
      'Friday, Jan 5, 2024',
      'Saturday, Jan 6, 2024',
    ];
    dates.forEach(date => {
      expect(screen.getByText(date)).toBeInTheDocument();
    });
  });
});

