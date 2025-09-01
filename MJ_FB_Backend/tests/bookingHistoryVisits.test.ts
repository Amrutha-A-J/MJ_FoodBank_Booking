import mockPool from './utils/mockDb';
import { fetchBookingHistory } from '../src/models/bookingRepository';


describe('fetchBookingHistory includeVisits', () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
  });

  it('returns walk-in visits when includeVisits flag is true', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            status: 'approved',
            date: '2024-01-01',
            slot_id: 1,
            reason: null,
            start_time: '09:00:00',
            end_time: '10:00:00',
            created_at: '2024-01-01',
            is_staff_booking: false,
            reschedule_token: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            status: 'visited',
            date: '2024-01-02',
            slot_id: null,
            reason: null,
            start_time: null,
            end_time: null,
            created_at: '2024-01-02',
            is_staff_booking: false,
            reschedule_token: null,
          },
        ],
      });

    const rows = await fetchBookingHistory([1], false, undefined, true);
    expect(rows).toHaveLength(2);
    const statuses = rows.map(r => r.status).sort();
    expect(statuses).toEqual(['approved', 'visited']);
    const visitQuery = (mockPool.query as jest.Mock).mock.calls[1][0];
    expect(visitQuery).toMatch(/LEFT JOIN bookings b/);
    expect(visitQuery).toMatch(/b\.id IS NULL/);
  });

  it('omits visits that already have a booking', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            status: 'approved',
            date: '2024-01-01',
            slot_id: 1,
            reason: null,
            start_time: '09:00:00',
            end_time: '10:00:00',
            created_at: '2024-01-01',
            is_staff_booking: false,
            reschedule_token: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const rows = await fetchBookingHistory([1], false, undefined, true);
    expect(rows).toHaveLength(1);
    const visitQuery = (mockPool.query as jest.Mock).mock.calls[1][0];
    expect(visitQuery).toMatch(/LEFT JOIN bookings b/);
    expect(visitQuery).toMatch(/b\.id IS NULL/);
  });
});

