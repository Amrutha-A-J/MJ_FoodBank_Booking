import { apiFetch, handleResponse } from '../api/client';
import {
  markBookingNoShow,
  markBookingVisited,
} from '../api/bookings';

jest.mock('../api/client', () => ({
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

  it('calls visited endpoint', async () => {
    await markBookingVisited(7, 'notes');
    expect(apiFetch).toHaveBeenCalledWith('/api/bookings/7/visited', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ requestData: 'notes' }),
    }));
  });

  it('includes note when provided', async () => {
    await markBookingVisited(8, undefined, 'memo');
    expect(apiFetch).toHaveBeenCalledWith('/api/bookings/8/visited', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ note: 'memo' }),
    }));
  });
});
