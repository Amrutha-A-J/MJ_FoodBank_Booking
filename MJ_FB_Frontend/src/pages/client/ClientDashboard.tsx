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
import ClientBottomNav from '../../components/ClientBottomNav';
import { getBookingHistory, getSlots, getHolidays, cancelBooking } from '../../api/bookings';
import { getEvents, type EventGroups } from '../../api/events';
import type { Slot, Holiday, Booking } from '../../types';
import { formatTime, formatReginaDate, formatRegina } from '../../utils/time';
import type { AlertColor } from '@mui/material';
import SectionCard from '../../components/dashboard/SectionCard';
import EventList from '../../components/EventList';
import { toDate } from '../../utils/date';
import Page from '../../components/Page';
import OnboardingModal from '../../components/OnboardingModal';

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

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextSlots, setNextSlots] = useState<NextSlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const statusLabels: Record<string, string> = {
    approved: 'Approved',
    visited: 'Visited',
    cancelled: 'Cancelled',
    no_show: 'No show',
    pending: 'Pending',
  };
  
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
    getHolidays().then(setHolidays).catch(() => {});
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
      setMessage("Booking cancelled");
      setSnackbarSeverity('success');
      setBookings(prev => prev.filter(b => b.id !== cancelId));
    } catch (err) {
      setMessage("Failed to cancel booking");
      setSnackbarSeverity('error');
    } finally {
      setCancelId(null);
    }
  }

  return (
    <Page title={"Client Dashboard"}>
      <OnboardingModal
        storageKey="clientOnboarding"
        title={"Welcome"}
        body={"Use Book Appointment to schedule visits. Your dashboard shows upcoming bookings."}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{"My Upcoming Appointment"}</span>
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
                          {"Cancel"}
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
                          {"Reschedule"}
                        </Button>
                      </Stack>
                    </Stack>
                  </ListItem>
                </List>
              ) : (
                <Stack spacing={1} alignItems="flex-start">
                  <Typography>{"No appointment booked —"}</Typography>
                  <Button

                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate('/book-appointment')}
                  >
                    {"Book now"}
                  </Button>
                </Stack>
              )}
            </SectionCard>
            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{"Booking History"}</span>
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
                          label={statusLabels[b.status] ?? b.status}
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
            <SectionCard title={"Quick Actions"}>
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
                  {"Book Shopping Appointment"}
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
                  {"Reschedule"}
                </Button>
                <Button
                  
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    width: { xs: '100%', sm: 'auto' },
                  }}
                  onClick={() => navigate('/booking-history')}
                >
                  {"Cancel"}
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{"News & Events"}</span>
                </Stack>
              }
              icon={<Announcement color="primary" />}
            >
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

            <SectionCard
              title={"Next Available Slots"}
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
                          {"Book"}
                        </Button>
                      </Stack>
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary={"No slots available. Please choose another date."} />
                  </ListItem>
                )}
              </List>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
        <Dialog open={cancelId !== null} onClose={() => setCancelId(null)}>
          <DialogCloseButton onClose={() => setCancelId(null)} />
          <DialogTitle>{"Cancel booking"}</DialogTitle>
          <DialogContent>
            <Typography>{"Are you sure you want to cancel this booking?"}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              
              color="error"
              variant="contained"
              sx={{ textTransform: 'none' }}
              onClick={confirmCancel}
            >
              {"Cancel booking"}
            </Button>
          </DialogActions>
        </Dialog>
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
