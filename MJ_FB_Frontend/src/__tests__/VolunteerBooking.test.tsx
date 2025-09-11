import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from '../utils/date';
import VolunteerBooking from '../pages/volunteer-management/VolunteerBooking';
import {
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  resolveVolunteerBookingConflict,
} from '../api/volunteers';
import { getHolidays } from '../api/bookings';

jest.mock('../api/volunteers', () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
}));

jest.mock('../api/bookings', () => ({
  getHolidays: jest.fn(),
}));

describe('VolunteerBooking', () => {
  it('requests a slot and shows confirmation', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockImplementation(async (date: string) => [
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
        date,
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    (requestVolunteerBooking as jest.Mock).mockResolvedValue({
      id: 1,
      role_id: 1,
      volunteer_id: 1,
      date: '2024-01-01',
      status: 'approved',
    });

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            dateLibInstance={dayjs}
          >
            <VolunteerBooking />
          </LocalizationProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const slot = await screen.findByText(/9:00 AM/);
    fireEvent.click(slot);
    fireEvent.change(screen.getByLabelText(/Note/i), {
      target: { value: 'bring gloves' },
    });
    fireEvent.click(screen.getByRole('button', { name: /request shift/i }));

    await waitFor(() =>
      expect(requestVolunteerBooking).toHaveBeenCalledWith(
        1,
        expect.any(String),
        'bring gloves',
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('Shift booked')).toBeInTheDocument(),
    );
  });

  it('handles overlapping booking and replaces when chosen', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
        date: '2024-01-01',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    const err = new Error('conflict') as any;
    err.status = 409;
    err.details = {
      attempted: {
        role_id: 1,
        role_name: 'Greeter',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '12:00:00',
      },
      existing: {
        id: 2,
        role_id: 3,
        role_name: 'Sorter',
        date: '2024-01-01',
        start_time: '10:00:00',
        end_time: '13:00:00',
      },
    };
    (requestVolunteerBooking as jest.Mock).mockRejectedValue(err);
    (resolveVolunteerBookingConflict as jest.Mock).mockResolvedValue({
      id: 5,
      role_id: 1,
      date: '2024-01-01',
      start_time: '09:00:00',
      end_time: '12:00:00',
      role_name: 'Greeter',
      status: 'approved',
    });

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            dateLibInstance={dayjs}
          >
            <VolunteerBooking />
          </LocalizationProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const slot = await screen.findByText(/9:00 AM/);
    fireEvent.click(slot);
    fireEvent.click(screen.getByRole('button', { name: /request shift/i }));
    await screen.findByText(/Shift Conflict/i);
    fireEvent.click(screen.getByText(/Replace with New Shift/i));
    await waitFor(() =>
      expect(resolveVolunteerBookingConflict).toHaveBeenCalledWith(
        2,
        1,
        '2024-01-01',
        'new',
      ),
    );
  });
});
