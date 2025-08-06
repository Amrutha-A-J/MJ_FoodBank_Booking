import { useEffect, useState, useCallback } from 'react';
import { getBookings, decideBooking } from '../../api/api';
import { formatInTimeZone } from 'date-fns-tz';

interface Booking {
  id: number;
  status: string;
  date: string;
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone: string;
  client_id: number;
  bookings_this_month: number;
  slot_id: number;
  start_time: string;
  end_time: string;
  is_staff_booking: boolean;
  created_at: string;
}

export default function StaffDashboard({
  token,
  setError,
  setLoading,
}: {
  token: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: Booking[] = await getBookings(token);
      console.log('Received bookings:', data);
      setBookings(data);
    } catch (err: unknown) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [token, setError, setLoading]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function decide(id: number, decision: 'approve' | 'reject') {
    setError('');
    let reason = '';
    if (decision === 'reject') {
      reason = window.prompt('Reason for rejection?')?.trim() || '';
      if (!reason) {
        setError('Rejection reason is required');
        return;
      }
    }
    setLoading(true);
    try {
      await decideBooking(token, id.toString(), decision, reason);
      setMessage(`Booking ${decision}d`);
      await loadBookings();
    } catch (err: unknown) {
      console.error('Error deciding booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to process decision');
    } finally {
      setLoading(false);
    }
  }

  const pending = bookings.filter(b => b.status === 'submitted');
  const reginaTimeZone = 'America/Regina';
  const formatDate = (dateStr: string) => {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    return formatInTimeZone(parsed, reginaTimeZone, 'yyyy-MM-dd', {});
  };

  return (
    <div>
      <h2>Staff Dashboard - Pending Appointments</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {pending.length === 0 && <p>No pending bookings.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {pending.map(b => {
          return (
            <li
              key={b.id}
              style={{
                marginBottom: 16,
                padding: 12,
                border: '1px solid #ccc',
                borderRadius: 6,
              }}
            >
              <div><strong>Booking ID:</strong> {b.id}</div>
              <div><strong>Client ID:</strong> {b.client_id}</div>
              <div><strong>Uses This Month:</strong> {b.bookings_this_month}</div>
              <div><strong>Date:</strong> {formatDate(b.date)}</div>
              <div><strong>User:</strong> {b.user_name || 'Unknown'} ({b.user_email || 'N/A'}, {b.user_phone || 'N/A'})</div>
              <div><strong>Slot:</strong> {b.start_time && b.end_time ? `${b.start_time} - ${b.end_time}` : 'No slot assigned'}</div>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => decide(b.id, 'approve')} style={btnApprove}>
                  Approve
                </button>{' '}
                <button onClick={() => decide(b.id, 'reject')} style={btnReject}>
                  Reject
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  );
}

const btnApprove: React.CSSProperties = {
  backgroundColor: '#4caf50',
  border: 'none',
  color: 'white',
  padding: '6px 12px',
  borderRadius: 4,
  cursor: 'pointer',
};

const btnReject: React.CSSProperties = {
  backgroundColor: '#f44336',
  border: 'none',
  color: 'white',
  padding: '6px 12px',
  borderRadius: 4,
  cursor: 'pointer',
};
