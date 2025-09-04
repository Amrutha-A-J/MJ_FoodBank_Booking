import { apiFetch, handleResponse } from '../client';
import {
  markBookingNoShow,
  markBookingVisited,
  createBooking,
} from '../bookings';

jest.mock('../client', () => ({
  API_BASE: '/api',
  apiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('bookings api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('calls no-show endpoint', async () => {
    await markBookingNoShow(5, 'reason');
    expect(apiFetch).toHaveBeenCalledWith('/api/bookings/5/no-show', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ reason: 'reason' }),
    }));
  });

  it('calls visited endpoint with note', async () => {
    await markBookingVisited(7, 'notes', 'visit');
    expect(apiFetch).toHaveBeenCalledWith('/api/bookings/7/visited', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ requestData: 'notes', note: 'visit' }),
    }));
  });

  it('creates booking with note', async () => {
    await createBooking('3', '2024-05-01', 'note');
    expect(apiFetch).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ slotId: 3, date: '2024-05-01', note: 'note' }),
    }));
  });
});
