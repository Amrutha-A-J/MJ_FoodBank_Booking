import mockPool, { setQueryResults } from './utils/mockDb';
import {
  checkSlotCapacity,
  insertBooking,
  updateBooking,
  SlotCapacityError,
  fetchBookings,
  fetchBookingsForReminder,
  fetchBookingHistory,
} from '../src/models/bookingRepository';
import { formatReginaDate } from '../src/utils/dateUtils';


describe('bookingRepository', () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('checkSlotCapacity', () => {
    it('throws for invalid slot', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      await expect(checkSlotCapacity(1, '2024-01-01')).rejects.toBeInstanceOf(
        SlotCapacityError,
      );
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('throws when slot full', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ max_capacity: 1, approved_count: 1 }],
        });
      await expect(checkSlotCapacity(1, '2024-01-01')).rejects.toThrow(
        'Slot full on selected date',
      );
      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[1];
      expect(sql).toMatch(/COUNT/);
      expect(sql).toMatch(/FOR UPDATE/);
      expect(params).toEqual([1, '2024-01-01']);
    });

    it('resolves when slot has capacity', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ max_capacity: 2, approved_count: 1 }],
        });
      await expect(checkSlotCapacity(1, '2024-01-01')).resolves.toBeUndefined();
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
  });

  it('insertBooking calls query with correct params', async () => {
    setQueryResults({ rows: [{ id: 1 }] });
    const id = await insertBooking(1, 2, 'approved', '', '2024-01-01', false, 'token', null, 'note');
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/INSERT INTO bookings/);
    expect(call[1]).toEqual(
      expect.arrayContaining([
        1,
        null,
        2,
        'approved',
        '',
        'note',
        '2024-01-01',
        false,
        'token',
      ]),
    );
    expect(call[1]).toHaveLength(9);
    expect(id).toBe(1);
  });

  it('updateBooking ignores disallowed keys', async () => {
    setQueryResults({});
    await updateBooking(1, {
      status: 'cancelled',
      request_data: 'reason',
      hacker: 'nope',
    });
    expect(mockPool.query).toHaveBeenCalled();
    const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
    expect(sql).toEqual(
      expect.stringContaining('UPDATE bookings SET status=$2, request_data=$3'),
    );
    expect(sql).toEqual(expect.stringContaining('WHERE id=$1'));
    expect(params).toEqual(expect.arrayContaining([1, 'cancelled', 'reason']));
    expect(params).toHaveLength(3);
  });

  it('updateBooking formats date field', async () => {
    setQueryResults({});
    const date = '2024-01-01T06:00:00Z';
    await updateBooking(1, { date });
    const params = (mockPool.query as jest.Mock).mock.calls[0][1];
    expect(params).toEqual([
      1,
      formatReginaDate(date),
    ]);
  });

  it('updateBooking returns early when only disallowed keys provided', async () => {
    await updateBooking(1, { hacker: 'nope' });
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('fetchBookings applies optional filters', async () => {
    setQueryResults({ rows: [] });
    await fetchBookings('approved', '2024-01-01', [1, 2]);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/SELECT/);
    expect(call[0]).toMatch(/WHERE/);
    expect(call[0]).toMatch(/b\.note/);
    expect(call[0]).toMatch(/b.status = \$1/);
    expect(call[0]).toMatch(/b.date = \$2/);
    expect(call[0]).toMatch(/u.client_id = ANY\(\$3\)/);
    expect(call[1]).toEqual(
      expect.arrayContaining([
        'approved',
        '2024-01-01',
        expect.arrayContaining([1, 2]),
      ]),
    );
    expect(call[1]).toHaveLength(3);
  });

  it('fetchBookings returns notes from query result', async () => {
    setQueryResults({ rows: [{ id: 1, note: 'remember ID' }] });
    const rows = await fetchBookings(undefined, undefined, undefined);
    expect(rows[0].note).toBe('remember ID');
  });

  it('fetchBookings joins monthly visits view', async () => {
    setQueryResults({ rows: [] });
    await fetchBookings(undefined, undefined, undefined);
    const query = (mockPool.query as jest.Mock).mock.calls[0][0];
    expect(query).toMatch(/LEFT JOIN\s+monthly_client_visits\s+v\s+ON/);
  });

  it('fetchBookings counts approved bookings using correlated subquery', async () => {
    setQueryResults({ rows: [] });
    await fetchBookings(undefined, undefined, undefined);
    const query = (mockPool.query as jest.Mock).mock.calls[0][0];
    expect(query).toMatch(/LEFT JOIN LATERAL/);
    expect(query).toMatch(/SELECT COUNT\(\*\)::int AS approved_count/);
    expect(query).toMatch(/b2\.status = 'approved'/);
    expect(query).toMatch(/DATE_TRUNC\('month', b2\.date\) = DATE_TRUNC\('month', b\.date\)/);
  });

  it('fetchBookings returns aggregate counts for fresh approved booking', async () => {
    setQueryResults({ rows: [{ id: 1, visits_this_month: 0, approved_bookings_this_month: 1 }] });
    const rows = await fetchBookings(undefined, undefined, undefined);
    expect(rows[0].visits_this_month).toBe(0);
    expect(rows[0].approved_bookings_this_month).toBe(1);
  });

  it('fetchBookingsForReminder selects only necessary fields', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] });
    await fetchBookingsForReminder('2024-01-01');
    const call = (mockPool.query as jest.Mock).mock.calls[1];
    expect(call[0]).toMatch(/SELECT/);
    expect(call[0]).toMatch(
      /b.id,\s+b.user_id,\s+COALESCE\(u.email, nc.email\) as user_email,\s+s.start_time,\s+s.end_time,\s+b.reschedule_token/,
    );
    expect(call[0]).toMatch(/LEFT JOIN user_preferences/);
    expect(call[0]).toMatch(/up.user_id = b.user_id/);
    expect(call[0]).toMatch(/up.user_id = b.new_client_id/);
    expect(call[0]).toMatch(/COALESCE\(up.email_reminders, true\)/);
    expect(call[0]).toMatch(/WHERE/);
    expect(call[0]).toMatch(/b.status = 'approved'/);
    expect(call[0]).toMatch(/b.date = \$1/);
    expect(call[0]).toMatch(/b.reminder_sent = false/);
    expect(call[1]).toEqual(expect.arrayContaining(['2024-01-01']));
    expect(call[1]).toHaveLength(1);
  });

  it('fetchBookingsForReminder omits new clients with email reminders disabled', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const rows = await fetchBookingsForReminder('2024-01-01');
    expect(rows).toEqual([]);
    const query = (mockPool.query as jest.Mock).mock.calls[1][0];
    expect(query).toMatch(/COALESCE\(up.email_reminders, true\)/);
  });

  it('fetchBookingHistory supports arrays and pagination', async () => {
    setQueryResults({ rows: [] });
    await fetchBookingHistory([1, 2], false, undefined, false, 5, 10);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/SELECT/);
    expect(call[0]).toMatch(/WHERE/);
    expect(call[0]).toMatch(/b.user_id = ANY\(\$1\)/);
    expect(call[0]).toMatch(
      /ORDER BY \(b.status='approved' AND b.date >= CURRENT_DATE\) DESC, b.date DESC/
    );
    expect(call[0]).toMatch(/LIMIT \$2/);
    expect(call[0]).toMatch(/OFFSET \$3/);
    expect(call[1]).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([1, 2]),
        5,
        10,
      ]),
    );
    expect(call[1]).toHaveLength(3);
  });

  it('fetchBookingHistory uses LEFT JOIN on slots', async () => {
    setQueryResults({ rows: [] });
    await fetchBookingHistory([1], false, undefined, false);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/LEFT JOIN\s+slots\s+s\s+ON b.slot_id = s.id/);
  });

  it('fetchBookingHistory LEFT JOINs client_visits for staff notes', async () => {
    setQueryResults({ rows: [] });
    await fetchBookingHistory([1], false, undefined, false);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(
      /LEFT JOIN\s+client_visits\s+v\s+ON v.client_id = b.user_id AND v.date = b.date AND v.is_anonymous = false/,
    );
    expect(call[0]).toMatch(/v.note AS staff_note/);
  });

  it('fetchBookingHistory returns staff notes and null client notes for visited bookings when includeVisits is true', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            status: 'visited',
            date: '2024-01-01',
            slot_id: 1,
            reason: null,
            start_time: '09:00:00',
            end_time: '10:00:00',
            created_at: '2024-01-01',
            is_staff_booking: false,
            reschedule_token: null,
            client_note: null,
            staff_note: 'visit note',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const rows = await fetchBookingHistory([1], false, undefined, true);
    expect(rows).toHaveLength(1);
    expect(rows[0].client_note).toBeNull();
    expect(rows[0].staff_note).toBe('visit note');
  });

  it('fetchBookingHistory sorts upcoming approved bookings first when including visits', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            status: 'visited',
            date: '2024-01-01',
            slot_id: 1,
            reason: null,
            start_time: '09:00:00',
            end_time: '10:00:00',
            created_at: '2024-01-01',
            is_staff_booking: false,
            reschedule_token: null,
            client_note: null,
            staff_note: 'note',
          },
          {
            id: 1,
            status: 'approved',
            date: '2099-01-01',
            slot_id: 1,
            reason: null,
            start_time: '09:00:00',
            end_time: '10:00:00',
            created_at: '2024-01-01',
            is_staff_booking: false,
            reschedule_token: null,
            client_note: null,
            staff_note: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            status: 'visited',
            date: '2023-01-01',
            slot_id: null,
            reason: null,
            start_time: null,
            end_time: null,
            created_at: '2023-01-01',
            is_staff_booking: false,
            reschedule_token: null,
            staff_note: 'visit note',
          },
        ],
      });

    const rows = await fetchBookingHistory([1], false, undefined, true);
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('fetchBookingHistory can omit client notes when includeClientNotes is false', async () => {
    setQueryResults({ rows: [] });
    await fetchBookingHistory([1], false, undefined, false, undefined, undefined, false);
    const call = (mockPool.query as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/NULL AS client_note/);
  });

  it('fetchBookingHistory casts booking and visit dates to YYYY-MM-DD strings', async () => {
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
            created_at: '2024-01-01T00:00:00Z',
            is_staff_booking: false,
            reschedule_token: null,
            client_note: null,
            staff_note: null,
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
            staff_note: 'visit note',
          },
        ],
      });

    const rows = await fetchBookingHistory([1], false, undefined, true);
    const firstSql = (mockPool.query as jest.Mock).mock.calls[0][0];
    const secondSql = (mockPool.query as jest.Mock).mock.calls[1][0];
    expect(firstSql).toMatch(/to_char\(b.date, 'YYYY-MM-DD'\) AS date/);
    expect(secondSql).toMatch(/to_char\(v.date, 'YYYY-MM-DD'\) AS date/);
    expect(secondSql).toMatch(/to_char\(v.date, 'YYYY-MM-DD'\) AS created_at/);
    expect(rows.map(r => r.date).sort()).toEqual(['2024-01-01', '2024-01-02']);
    rows.forEach(r => {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
