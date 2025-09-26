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
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EventAvailable from '@mui/icons-material/EventAvailable';
import Announcement from '@mui/icons-material/Announcement';
import History from '@mui/icons-material/History';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import ClientBottomNav from '../../components/ClientBottomNav';
import { getBookingHistory, getSlots, cancelBooking } from '../../api/bookings';
import { getEvents, type EventGroups } from '../../api/events';
import type { Slot, Booking } from '../../types';
import { formatTime, formatReginaDate, formatRegina } from '../../utils/time';
import type { AlertColor } from '@mui/material';
import SectionCard from '../../components/dashboard/SectionCard';
import EventList from '../../components/EventList';
import UpcomingHolidaysCard from '../../components/dashboard/UpcomingHolidaysCard';
import { toDate } from '../../utils/date';
import Page from '../../components/Page';
import OnboardingModal from '../../components/OnboardingModal';
import FormDialog from '../../components/FormDialog';

interface NextSlot {
  date: string;
  slot: Slot;
}

function formatDate(dateStr: string) {
  const d = toDate(dateStr);
  return formatReginaDate(d, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
    case 'cancelled':
    case 'no_show':
      return 'error';
    default:
      return 'info';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'cancelled':
      return 'Cancelled';
    case 'visited':
      return 'Visited';
    case 'no_show':
      return 'No Show';
    default:
      return status;
  }
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextSlots, setNextSlots] = useState<NextSlot[]>([]);
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');

  useEffect(() => {
    getBookingHistory({ includeVisits: true })
      .then(b => setBookings(Array.isArray(b) ? b : [b]))
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
    getEvents()
      .then(data =>
        setEvents(data ?? { today: [], upcoming: [], past: [] }),
      )
      .catch(() =>
        setEvents({ today: [], upcoming: [], past: [] }),
      );
  }, []);

  const today = toDate();
  const approved = bookings
    .filter(b => b.status === 'approved' && toDate(b.date) >= today)
    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  const next = approved[0];
  const history = bookings
    .slice()
    .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());

  async function confirmCancel() {
    if (cancelId === null) return;
    try {
      await cancelBooking(String(cancelId));
      setMessage('Booking cancelled');
      setSnackbarSeverity('success');
      setBookings(prev => prev.filter(b => b.id !== cancelId));
    } catch (err) {
      setMessage('Failed to cancel booking');
      setSnackbarSeverity('error');
    } finally {
      setCancelId(null);
    }
  }

  return (
    <Page
      title="Client Dashboard"
      sx={{ pb: { xs: 'calc(72px + env(safe-area-inset-bottom))' } }}
    >
      <OnboardingModal
        storageKey="clientOnboarding"
        title="Welcome!"
        body="Use this dashboard to book, reschedule, or cancel appointments."
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>My Upcoming Appointment</span>
                </Stack>
              }
              icon={<EventAvailable color="primary" />}
            >
              {next ? (
                <List>
                  <ListItem disableGutters>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                      sx={{ width: '100%' }}
                    >
                      <Typography>
                        {`${formatDate(next.date)} ${formatTime(
                          next.start_time || '',
                        )}`}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          
                          variant="outlined"
                          sx={{ textTransform: 'none' }}
                          onClick={() => setCancelId(next.id)}
                        >
                    Cancel
                        </Button>
                        <Button

                          variant="contained"
                          sx={{ textTransform: 'none' }}
                          onClick={() =>
                            next.reschedule_token &&
                            navigate(`/reschedule/${next.reschedule_token}`)
                          }
                          disabled={!next.reschedule_token}
                        >
                    Reschedule
                        </Button>
                      </Stack>
                    </Stack>
                  </ListItem>
                </List>
              ) : (
                <Stack spacing={1} alignItems="flex-start">
                  <Typography>No appointment booked</Typography>
                  <Button

                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate('/book-appointment')}
                  >
                    Book now
                  </Button>
                </Stack>
              )}
            </SectionCard>
            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Booking History</span>
                </Stack>
              }
              icon={<History color="primary" />}
            >
              <List>
                {history.slice(0, 3).map(b => {
                  const time = b.start_time ? formatTime(b.start_time) : '';
                  return (
                    <ListItem key={`${b.id}-${b.date}`} disableGutters>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ width: '100%' }}
                      >
                        <ListItemText
                          primary={
                            time
                              ? `${formatDate(b.date)} ${time}`
                              : formatDate(b.date)
                          }
                        />
                        <Chip
                          label={statusLabel(b.status)}
                          color={statusColor(b.status)}
                        />
                      </Stack>
                    </ListItem>
                  );
                })}
              </List>
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
              <SectionCard title="Quick Actions">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    width: { xs: '100%', sm: 'auto' },
                  }}
                  onClick={() => navigate('/book-appointment')}
                >
                    Book shopping appointment
                </Button>
                <Button

                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    width: { xs: '100%', sm: 'auto' },
                  }}
                  onClick={() =>
                    next?.reschedule_token &&
                    navigate(`/reschedule/${next.reschedule_token}`)
                  }
                  disabled={!next?.reschedule_token}
                >
                  Reschedule
                </Button>
                <Button
                  
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    width: { xs: '100%', sm: 'auto' },
                  }}
                  onClick={() => navigate('/booking-history')}
                >
                  Cancel
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>News and Events</span>
                </Stack>
              }
              icon={<Announcement color="primary" />}
            >
              <EventList events={[...events.today, ...events.upcoming]} limit={5} />
            </SectionCard>

            <UpcomingHolidaysCard limit={5} />

            <SectionCard
              title="Next available slots"
              icon={<EventAvailable color="primary" />}
            >
              <List sx={{ '& .MuiListItem-root:not(:last-child)': { mb: 1 } }}>
                {nextSlots.length ? (
                  nextSlots.map(s => (
                    <ListItem key={`${s.date}-${s.slot.id}`} disableGutters>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ width: '100%' }}
                      >
                        <ListItemText
                          primary={`${formatDate(s.date)} ${formatTime(
                            s.slot.startTime,
                          )}-${formatTime(s.slot.endTime)}`}
                        />
                        <Button

                          variant="contained"
                          sx={{
                            textTransform: 'none',
                            width: { xs: '100%', sm: 'auto' },
                          }}
                          onClick={() => navigate('/book-appointment')}
                        >
                          Book
                        </Button>
                      </Stack>
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="No slots available" />
                  </ListItem>
                )}
              </List>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
        <FormDialog open={cancelId !== null} onClose={() => setCancelId(null)} maxWidth="xs">
          <DialogCloseButton onClose={() => setCancelId(null)} />
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to cancel this booking?</Typography>
          </DialogContent>
          <DialogActions>
            <Button

              variant="outlined"
              sx={{ textTransform: 'none' }}
              onClick={() => setCancelId(null)}
            >
              Keep booking
            </Button>
            <Button

              color="error"
              variant="contained"
              sx={{ textTransform: 'none' }}
              onClick={confirmCancel}
            >
              Cancel booking
            </Button>
          </DialogActions>
        </FormDialog>
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={snackbarSeverity}
      />
      <ClientBottomNav />
    </Page>
  );
}
