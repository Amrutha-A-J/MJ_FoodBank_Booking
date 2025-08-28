import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
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
import EventAvailable from '@mui/icons-material/EventAvailable';
import Announcement from '@mui/icons-material/Announcement';
import History from '@mui/icons-material/History';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import { getBookingHistory, getSlots, getHolidays, cancelBooking } from '../../api/bookings';
import { getEvents, type EventGroups } from '../../api/events';
import type { Slot, Holiday } from '../../types';
import { formatTime, formatReginaDate, formatRegina } from '../../utils/time';
import type { AlertColor } from '@mui/material';
import SectionCard from '../../components/dashboard/SectionCard';
import EventList from '../../components/EventList';
import { toDate } from '../../utils/date';
import Page from '../../components/Page';

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

function formatDate(dateStr: string) {
  const d = toDate(dateStr);
  return formatReginaDate(d, { month: 'short', day: 'numeric' });
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
    case 'visited':
      return 'success';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'rejected':
    case 'no_show':
    case 'expired':
      return 'error';
    default:
      return 'info';
  }
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextSlots, setNextSlots] = useState<NextSlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');

  useEffect(() => {
    getBookingHistory()
      .then(setBookings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const today = toDate();
    Promise.all(
      [...Array(7)].map(async (_, i) => {
        const d = toDate(today);
        d.setDate(today.getDate() + i);
        const dateStr = formatRegina(d, 'yyyy-MM-dd');
        const slots = (await getSlots(dateStr)) as Slot[];
        const first = slots.find(s => (s.available ?? 0) > 0);
        return first ? { date: dateStr, slot: first } : null;
      }),
    )
      .then(res => setNextSlots(res.filter(Boolean).slice(0, 3) as NextSlot[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getHolidays().then(setHolidays).catch(() => {});
  }, []);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
  }, []);

  const today = toDate();
  const approved = bookings
    .filter(b => b.status === 'approved' && toDate(b.date) >= today)
    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  const next = approved[0];
  const history = bookings
    .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());

  async function confirmCancel() {
    if (cancelId === null) return;
    try {
      await cancelBooking(cancelId);
      setMessage('Booking cancelled');
      setSnackbarSeverity('success');
      setBookings(prev => prev.filter(b => b.id !== cancelId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
      setSnackbarSeverity('error');
    } finally {
      setCancelId(null);
    }
  }

  return (
    <Page title="Client Dashboard">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
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
                  onClick={() => navigate('/book-appointment')}
                >
                  Book now
                </Button>
              </Typography>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
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
                        onClick={() => navigate('/book-appointment')}
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
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="News & Events" icon={<Announcement color="primary" />}>
            <Stack spacing={2}>
              <EventList events={[...events.today, ...events.upcoming]} limit={5} />
              <List>
                {holidays.map(h => (
                  <ListItem key={h.date}>
                    <ListItemText
                      primary={`${formatDate(h.date)} ${h.reason}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={12}>
          <SectionCard title="Quick Actions">
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                sx={{ textTransform: 'none' }}
                onClick={() => navigate('/book-appointment')}
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
        <Grid size={12}>
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
          <DialogCloseButton onClose={() => setCancelId(null)} />
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to cancel this booking?</Typography>
          </DialogContent>
          <DialogActions>
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
        severity={snackbarSeverity}
      />
    </Page>
  );
}
