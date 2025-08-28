import { describe, it, expect, jest } from '@jest/globals';
import pool from '../src/db';
import { findUpcomingBooking } from '../src/utils/bookingUtils';

jest.mock('../src/db');

describe('findUpcomingBooking', () => {
  it('ignores bookings with recorded visits', async () => {
    const mockQuery = pool.query as unknown as jest.Mock<any>;
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const result = await findUpcomingBooking(1);
    expect(mockQuery).toHaveBeenCalled();
    const query = mockQuery.mock.calls[0][0] as string;
    expect(query).toMatch(/client_visits/);
    expect(query).toMatch(/NOT EXISTS/);
    expect(result).toBeNull();
  });
});
