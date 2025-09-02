import { describe, it, expect, jest } from '@jest/globals';
import mockPool, { setQueryResults } from './utils/mockDb';
import { findUpcomingBooking } from '../src/utils/bookingUtils';


describe('findUpcomingBooking', () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
  });

  it('ignores bookings with recorded visits', async () => {
    const mockQuery = mockPool.query as jest.Mock;
    setQueryResults({ rowCount: 0, rows: [] });
    const result = await findUpcomingBooking(1);
    expect(mockQuery).toHaveBeenCalled();
    const query = mockQuery.mock.calls[0][0] as string;
    expect(query).toMatch(/client_visits/);
    expect(query).toMatch(/NOT EXISTS/);
    expect(result).toBeNull();
  });
});
