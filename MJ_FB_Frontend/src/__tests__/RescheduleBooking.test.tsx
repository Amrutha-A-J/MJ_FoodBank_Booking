import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from '../../testUtils/renderWithProviders';
import RescheduleBooking from '../pages/RescheduleBooking';
import * as bookingsApi from '../api/bookings';

jest.mock('../api/bookings');

describe('RescheduleBooking page', () => {
  it('reschedules booking with token', async () => {
    (bookingsApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '01:00:00', endTime: '01:30:00', available: 1, maxCapacity: 5 },
    ]);
    (bookingsApi.rescheduleBookingByToken as jest.Mock).mockResolvedValue(undefined);
    (bookingsApi.validateRescheduleToken as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(
      <MemoryRouter initialEntries={['/reschedule/tok123']}>
        <Routes>
          <Route path="/reschedule/:token" element={<RescheduleBooking />} />
        </Routes>
      </MemoryRouter>,
    );

    const dateInput = screen.getByLabelText('Date');
    fireEvent.change(dateInput, { target: { value: '2099-01-01' } });

    const timeSelect = await screen.findByLabelText('Time');
    fireEvent.mouseDown(timeSelect);
    fireEvent.click(screen.getByRole('option', { name: /1/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    await waitFor(() =>
      expect(bookingsApi.rescheduleBookingByToken).toHaveBeenCalledWith(
        'tok123',
        '1',
        '2099-01-01',
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('Booking rescheduled')).toBeInTheDocument(),
    );
  });

  it('shows API error message on submit failure', async () => {
    (bookingsApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '01:00:00', endTime: '01:30:00', available: 1, maxCapacity: 5 },
    ]);
    (bookingsApi.validateRescheduleToken as jest.Mock).mockResolvedValue(undefined);
    (bookingsApi.rescheduleBookingByToken as jest.Mock).mockRejectedValue(
      new Error('server says no'),
    );

    renderWithProviders(
      <MemoryRouter initialEntries={['/reschedule/tok123']}>
        <Routes>
          <Route path="/reschedule/:token" element={<RescheduleBooking />} />
        </Routes>
      </MemoryRouter>,
    );

    const dateInput = screen.getByLabelText('Date');
    fireEvent.change(dateInput, { target: { value: '2099-01-01' } });

    const timeSelect = await screen.findByLabelText('Time');
    fireEvent.mouseDown(timeSelect);
    fireEvent.click(screen.getByRole('option', { name: /1/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    await waitFor(() =>
      expect(screen.getByText('server says no')).toBeInTheDocument(),
    );
  });
});
