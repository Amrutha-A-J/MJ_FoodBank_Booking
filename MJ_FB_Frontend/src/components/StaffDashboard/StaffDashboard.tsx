import { useEffect, useState, useCallback } from 'react';
import { getBookings, decideBooking } from '../../api/api';
import { formatInTimeZone } from 'date-fns-tz';
import FeedbackSnackbar from '../FeedbackSnackbar';
import ConfirmDialog from '../ConfirmDialog';
import { TextField } from '@mui/material';

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
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  async function decide(id: number, decision: 'approve' | 'reject', reason = '') {
    setError('');
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

  function handleApprove(id: number) {
    void decide(id, 'approve');
  }

  function handleReject(id: number) {
    setRejectId(id);
    setRejectReason('');
  }

  function confirmReject() {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    void decide(rejectId as number, 'reject', rejectReason.trim());
    setRejectId(null);
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
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="success" />
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
                <button onClick={() => handleApprove(b.id)} style={btnApprove}>
                  Approve
                </button>{' '}
                <button onClick={() => handleReject(b.id)} style={btnReject}>
                  Reject
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {rejectId !== null && (
        <ConfirmDialog
          message="Reason for rejection?"
          onConfirm={confirmReject}
          onCancel={() => setRejectId(null)}
        >
          <TextField
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            fullWidth
            multiline
          />
        </ConfirmDialog>
      )}
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
