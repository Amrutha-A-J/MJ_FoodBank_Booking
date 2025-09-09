import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen, fireEvent } from '../../testUtils/renderWithProviders';
import RescheduleBooking from '../pages/RescheduleBooking';
import * as bookingsApi from '../api/bookings';

jest.mock('../api/bookings');

describe('RescheduleBooking page', () => {
  it('reschedules booking with token', async () => {
    (bookingsApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1, maxCapacity: 5 },
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
    fireEvent.change(dateInput, { target: { value: '2024-01-01' } });

    const timeSelect = await screen.findByLabelText('Time');
    fireEvent.change(timeSelect, { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    expect(await screen.findByText('Booking rescheduled')).toBeInTheDocument();
    expect(bookingsApi.rescheduleBookingByToken).toHaveBeenCalledWith(
      'tok123',
      '1',
      '2024-01-01',
    );
  });

  it('shows API error message on submit failure', async () => {
    (bookingsApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1, maxCapacity: 5 },
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
    fireEvent.change(dateInput, { target: { value: '2024-01-01' } });

    const timeSelect = await screen.findByLabelText('Time');
    fireEvent.change(timeSelect, { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    expect(await screen.findByText('server says no')).toBeInTheDocument();
  });
});
