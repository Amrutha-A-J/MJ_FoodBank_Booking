import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from '../utils/date';
import VolunteerBooking from '../pages/volunteer-management/VolunteerBooking';
import {
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
} from '../api/volunteers';
import { getHolidays } from '../api/bookings';
import { getUserProfile } from '../api/users';

jest.mock('../api/volunteers', () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  requestVolunteerBooking: jest.fn(),
}));

jest.mock('../api/bookings', () => ({
  getHolidays: jest.fn(),
}));

jest.mock('../api/users', () => ({
  getUserProfile: jest.fn(),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: 'volunteer', name: 'Test Vol' }),
}));

describe('VolunteerBooking', () => {
  const fixedNow = new Date('2025-09-16T08:00:00Z');
  let dateSpy: jest.SpyInstance<number, []> | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    dateSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(fixedNow.valueOf());
  });

  afterEach(() => {
    dateSpy?.mockRestore();
    jest.useRealTimers();
  });

  it('requests a slot and shows confirmation', async () => {
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 0 });
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        start_time: '09:00:00',
        end_time: '12:00:00',
        available: 3,
        status: 'available',
        name: 'Greeter',
      },
    ]);
    (requestVolunteerBooking as jest.Mock).mockResolvedValue({});

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

    await waitFor(() =>
      expect(
        screen.getByText(/9:00 am – 12:00 pm/i),
      ).toBeInTheDocument(),
    );
    const slot = screen.getByText(/9:00 am – 12:00 pm/i);
    fireEvent.click(slot);
    const bookButton = within(slot.closest('li')!).getByRole('button', {
      name: /book selected slot/i,
    });
    fireEvent.click(bookButton);
    const noteField = await screen.findByLabelText(/note/i);
    fireEvent.change(noteField, { target: { value: 'Bring gloves' } });
    fireEvent.click(
      await screen.findByRole('button', { name: /confirm/i }),
    );

    await waitFor(() =>
      expect(requestVolunteerBooking).toHaveBeenCalledWith(
        1,
        expect.any(String),
        'Bring gloves',
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByText('Slot booked successfully'),
      ).toBeInTheDocument(),
    );
  });
});
