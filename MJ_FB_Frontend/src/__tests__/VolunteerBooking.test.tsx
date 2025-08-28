import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import VolunteerBooking from '../pages/volunteer-management/VolunteerBooking';
import { getVolunteerRolesForVolunteer, requestVolunteerBooking } from '../api/volunteers';
import { getHolidays } from '../api/bookings';

jest.mock('../api/volunteers', () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  requestVolunteerBooking: jest.fn(),
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
    (requestVolunteerBooking as jest.Mock).mockResolvedValue(undefined);

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <VolunteerBooking />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const slot = await screen.findByText(/9:00 AM/);
    fireEvent.click(slot);
    fireEvent.click(screen.getByRole('button', { name: /request shift/i }));

    await waitFor(() =>
      expect(requestVolunteerBooking).toHaveBeenCalledWith(1, expect.any(String)),
    );
    await waitFor(() =>
      expect(screen.getByText('Request submitted')).toBeInTheDocument(),
    );
  });
});
