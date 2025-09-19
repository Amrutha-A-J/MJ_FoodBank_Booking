import { apiFetch, jsonApiFetch } from '../client';
import {
  markBookingNoShow,
  markBookingVisited,
  createBooking,
} from '../bookings';

jest.mock('../client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  jsonApiFetch: jest.fn(),
  handleResponse: jest.fn().mockResolvedValue(undefined),
}));

describe('bookings api', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockResolvedValue(new Response(null));
    (jsonApiFetch as jest.Mock).mockResolvedValue(new Response(null));
    jest.clearAllMocks();
  });

  it('calls no-show endpoint', async () => {
    await markBookingNoShow(5, 'reason');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/bookings/5/no-show',
      expect.objectContaining({
        method: 'POST',
        body: { reason: 'reason', type: 'Shopping Appointment' },
      })
    );
  });

  it('calls visited endpoint with note', async () => {
    await markBookingVisited(7, 'notes', 'visit');
    expect(jsonApiFetch).toHaveBeenCalledWith('/api/v1/bookings/7/visited', expect.objectContaining({
      method: 'POST',
      body: { requestData: 'notes', note: 'visit' },
    }));
  });

  it('creates booking with note', async () => {
    await createBooking('3', '2024-05-01', 'note');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/bookings',
      expect.objectContaining({
        method: 'POST',
        body: {
          slotId: 3,
          date: '2024-05-01',
          type: 'Shopping Appointment',
          note: 'note',
        },
      })
    );
  });

  it('omits note when blank', async () => {
    await createBooking('4', '2024-05-01', '   ');
    expect(jsonApiFetch).toHaveBeenCalledWith(
      '/api/v1/bookings',
      expect.objectContaining({
        method: 'POST',
        body: { slotId: 4, date: '2024-05-01', type: 'Shopping Appointment' },
      })
    );
  });
});
