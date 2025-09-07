import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RescheduleBooking from '../RescheduleBooking';
import * as bookingApi from '../../api/bookings';

jest.mock('../../api/bookings', () => ({
  getSlots: jest.fn(),
  rescheduleBookingByToken: jest.fn(),
}));

describe('RescheduleBooking Wednesday slot', () => {
  beforeEach(() => {
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '2', startTime: '18:30:00', endTime: '19:00:00', available: 1, maxCapacity: 1 },
    ]);
  });

  it('lists evening slot on Wednesday', async () => {
    render(
      <MemoryRouter initialEntries={['/reschedule/abc']}>
        <Routes>
          <Route path="/reschedule/:token" element={<RescheduleBooking />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2024-06-19' },
    });

    expect(await screen.findByText('6:30 PM - 7:00 PM')).toBeInTheDocument();
  });
});

