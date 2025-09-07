import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NoShowWeek from '../client-management/NoShowWeek';
import { getBookings } from '../../../api/bookings';
import { toDayjs, formatReginaDate } from '../../../utils/date';

jest.mock('../../../api/bookings', () => ({
  getBookings: jest.fn(),
}));

describe('NoShowWeek', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(
      toDayjs('2023-12-31', 'America/Regina').toDate(),
    );
    (getBookings as jest.Mock).mockImplementation(({ date }) => {
      if (date === '2023-12-31') {
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

  it('shows each day in tabs with full date when selected', async () => {
    render(
      <MemoryRouter>
        <NoShowWeek />
      </MemoryRouter>,
    );

    const base = toDayjs('2023-12-31', 'America/Regina').startOf('week');
    const days = Array.from({ length: 7 }, (_, i) =>
      toDayjs(formatReginaDate(base.add(i, 'day'))),
    );
    const labels = days.map(d => d.format('ddd'));
    const dates = days.map(d => d.format('dddd, MMM D, YYYY'));

    labels.forEach(label => {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    });

    for (let i = 0; i < labels.length; i++) {
      const tab = screen.getByRole('tab', { name: labels[i] });
      fireEvent.click(tab);
      expect(await screen.findByText(dates[i])).toBeInTheDocument();
    }
  });
});

