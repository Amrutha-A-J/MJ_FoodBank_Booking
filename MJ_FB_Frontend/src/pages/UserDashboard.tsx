import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { EventAvailable, Announcement, History } from '@mui/icons-material';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { getBookings, getSlots, getHolidays, cancelBooking } from '../api/api';
import type { Slot, Holiday } from '../types';
import { formatTime } from '../utils/time';

interface Booking {
  id: number;
  status: string;
  date: string;
  start_time?: string;
  end_time?: string;
  reschedule_token?: string;
}

interface NextSlot {
  date: string;
  slot: Slot;
}

const SectionCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: 1 }}>
    <CardHeader title={title} avatar={icon} />
    <CardContent>{children}</CardContent>
  </Card>
);

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function statusColor(status: string):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'submitted':
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'rejected':
      return 'error';
    default:
      return 'info';
  }
}

export default function UserDashboard({ token }: { token: string }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextSlots, setNextSlots] = useState<NextSlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getBookings(token).then(setBookings).catch(() => {});
  }, [token]);

  useEffect(() => {
    const today = new Date();
    Promise.all(
      [...Array(7)].map(async (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const slots = (await getSlots(token, dateStr)) as Slot[];
        const first = slots.find(s => (s.available ?? 0) > 0);
        return first ? { date: dateStr, slot: first } : null;
      }),
    )
      .then(res => setNextSlots(res.filter(Boolean).slice(0, 3) as NextSlot[]))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    getHolidays(token).then(setHolidays).catch(() => {});
  }, [token]);

  const today = new Date();
  const approved = bookings
    .filter(b => b.status === 'approved' && new Date(b.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const next = approved[0];
  const pending = bookings.filter(
    b => b.status === 'submitted' || b.status === 'pending',
  );
  const history = [...bookings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  async function confirmCancel() {
    if (!cancelId) return;
    try {
      await cancelBooking(token, String(cancelId));
      setMessage('Booking cancelled');
      setBookings(prev => prev.filter(b => b.id !== cancelId));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancelId(null);
    }
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SectionCard
            title="My Upcoming Appointment"
            icon={<EventAvailable color="primary" />}
          >
            {next ? (
              <List>
                <ListItem
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'none' }}
                        onClick={() => setCancelId(next.id)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ textTransform: 'none' }}
                        onClick={() => navigate('/booking-history')}
                      >
                        Reschedule
                      </Button>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={`${formatDate(next.date)} ${formatTime(
                      next.start_time || '',
                    )}`}
                  />
                </ListItem>
              </List>
            ) : (
              <Typography>
                No appointment booked —{' '}
                <Button
                  size="small"
                  variant="contained"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/slots')}
                >
                  Book now
                </Button>
              </Typography>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Pending Requests">
            <List>
              {pending.length ? (
                pending.map(p => (
                  <ListItem
                    key={p.id}
                    secondaryAction={
                      <Chip
                        label={p.status === 'submitted' ? 'Submitted' : 'Pending'}
                        color="warning"
                      />
                    }
                  >
                    <ListItemText
                      primary={`${formatDate(p.date)} ${formatTime(
                        p.start_time || '',
                      )}`}
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No pending requests" />
                </ListItem>
              )}
            </List>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard
            title="Next Available Slots"
            icon={<EventAvailable color="primary" />}
          >
            <List>
              {nextSlots.length ? (
                nextSlots.map(s => (
                  <ListItem
                    key={`${s.date}-${s.slot.id}`}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ textTransform: 'none' }}
                        onClick={() => navigate('/slots')}
                      >
                        Book
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`${formatDate(s.date)} ${formatTime(
                        s.slot.startTime,
                      )}-${formatTime(s.slot.endTime)}`}
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No available slots" />
                </ListItem>
              )}
            </List>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Notices" icon={<Announcement color="primary" />}>
            <List>
              {holidays.map(h => (
                <ListItem key={h.date}>
                  <ListItemText
                    primary={`${formatDate(h.date)} ${h.reason}`}
                  />
                </ListItem>
              ))}
              <ListItem>
                <ListItemText primary="Walk-ins welcome — appointments get priority." />
              </ListItem>
            </List>
          </SectionCard>
        </Grid>
        <Grid item xs={12}>
          <SectionCard title="Quick Actions">
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                sx={{ textTransform: 'none' }}
                onClick={() => navigate('/slots')}
              >
                Book Appointment
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none' }}
                onClick={() => navigate('/booking-history')}
              >
                Reschedule
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none' }}
                onClick={() => navigate('/booking-history')}
              >
                Cancel
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
        <Grid item xs={12}>
          <SectionCard title="Recent Bookings" icon={<History color="primary" />}>
            <List>
              {history.slice(0, 3).map(b => (
                <ListItem
                  key={b.id}
                  secondaryAction={
                    <Chip label={b.status} color={statusColor(b.status)} />
                  }
                >
                  <ListItemText
                    primary={`${formatDate(b.date)} ${formatTime(
                      b.start_time || '',
                    )}`}
                  />
                </ListItem>
              ))}
            </List>
          </SectionCard>
        </Grid>
      </Grid>
      <Dialog open={cancelId !== null} onClose={() => setCancelId(null)}>
        <DialogTitle>Cancel booking</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to cancel this booking?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            sx={{ textTransform: 'none' }}
            onClick={() => setCancelId(null)}
          >
            Keep booking
          </Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            sx={{ textTransform: 'none' }}
            onClick={confirmCancel}
          >
            Cancel booking
          </Button>
        </DialogActions>
      </Dialog>
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={message.includes('failed') ? 'error' : 'success'}
      />
    </>
  );
}
