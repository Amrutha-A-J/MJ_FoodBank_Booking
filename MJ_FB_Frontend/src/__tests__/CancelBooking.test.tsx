import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CancelBooking from '../pages/CancelBooking';
import { renderWithProviders, screen } from '../../testUtils/renderWithProviders';
import * as bookingsApi from '../api/bookings';

jest.mock('../api/bookings');

describe('CancelBooking page', () => {
  it('cancels booking with token', async () => {
    (bookingsApi.cancelBookingByToken as jest.Mock).mockResolvedValue(undefined);
    renderWithProviders(
      <MemoryRouter initialEntries={['/cancel/tok123']}>
        <Routes>
          <Route path="/cancel/:token" element={<CancelBooking />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Booking cancelled', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(bookingsApi.cancelBookingByToken).toHaveBeenCalledWith('tok123');
  });
});
