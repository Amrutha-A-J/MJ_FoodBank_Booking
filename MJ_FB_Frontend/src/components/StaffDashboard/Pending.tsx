import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, CardActions, Typography, TextField, Button } from '@mui/material';
import { getBookings, decideBooking } from '../../api/api';
import FeedbackSnackbar from '../FeedbackSnackbar';
import { formatTime } from '../../utils/time';

interface Booking {
  id: number;
  user_name?: string;
  client_id?: number;
  bookings_this_month?: number;
  date: string;
  start_time?: string;
  end_time?: string;
  startTime?: string;
  endTime?: string;
}

export default function Pending({ token }: { token: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  function loadBookings() {
    getBookings(token, { status: 'pending' })
      .then(setBookings)
      .catch(() => {});
  }

  useEffect(() => {
    loadBookings();
  }, [token]);

  async function handleDecision(id: number, decision: 'approve' | 'reject') {
    try {
      await decideBooking(token, String(id), decision, reasons[id] || '');
      setSeverity('success');
      setMessage(`Booking ${decision === 'approve' ? 'approved' : 'rejected'}`);
      setReasons(r => {
        const copy = { ...r };
        delete copy[id];
        return copy;
      });
      loadBookings();
    } catch (e) {
      setSeverity('error');
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Pending Requests
      </Typography>
      <Grid container spacing={2}>
        {bookings.map(b => (
          <Grid item xs={12} sm={6} md={4} key={b.id}>
            <Card variant="outlined" sx={{ borderRadius: 1 }}>
              <CardContent>
                <Typography variant="subtitle1">{b.user_name || 'Unknown'}</Typography>
                <Typography variant="body2">Client ID: {b.client_id ?? 'N/A'}</Typography>
                <Typography variant="body2">Uses this month: {b.bookings_this_month ?? 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                  {formatTime(b.start_time || b.startTime || '')} - {formatTime(b.end_time || b.endTime || '')}
                </Typography>
                <TextField
                  label="Reason (optional)"
                  size="small"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={reasons[b.id] || ''}
                  onChange={e => setReasons(r => ({ ...r, [b.id]: e.target.value }))}
                />
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ textTransform: 'none' }}
                  onClick={() => handleDecision(b.id, 'approve')}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={() => handleDecision(b.id, 'reject')}
                >
                  Reject
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {bookings.length === 0 && (
          <Grid item xs={12}>
            <Typography>No pending bookings.</Typography>
          </Grid>
        )}
      </Grid>
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity={severity} />
    </>
  );
}

