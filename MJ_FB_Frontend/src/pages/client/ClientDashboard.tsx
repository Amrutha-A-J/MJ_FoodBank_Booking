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
import type { Slot, Holiday, Booking } from '../../types';
import { formatTime, formatReginaDate, formatRegina } from '../../utils/time';
import type { AlertColor } from '@mui/material';
import SectionCard from '../../components/dashboard/SectionCard';
import EventList from '../../components/EventList';
import { toDate } from '../../utils/date';
import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
    getEvents().then(setEvents).catch(() => {});
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
      setMessage(t('booking_cancelled'));
      setSnackbarSeverity('success');
      setBookings(prev => prev.filter(b => b.id !== cancelId));
    } catch (err) {
      setMessage(t('cancel_booking_failed'));
      setSnackbarSeverity('error');
    } finally {
      setCancelId(null);
    }
  }

  return (
    <Page title={t('client_dashboard')}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{t('my_upcoming_appointment')}</span>
                </Stack>
              }
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
                          {t('cancel')}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ textTransform: 'none' }}
                          onClick={() => navigate('/booking-history')}
                        >
                          {t('reschedule')}
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
                  {t('no_appointment_booked')}{' '}
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate('/book-appointment')}
                  >
                    {t('book_now')}
                  </Button>
                </Typography>
              )}
            </SectionCard>
            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{t('booking_history')}</span>
                </Stack>
              }
              icon={<History color="primary" />}
            >
              <List>
                {history.slice(0, 3).map(b => {
                  const time = b.start_time ? formatTime(b.start_time) : '';
                  return (
                    <ListItem
                      key={`${b.id}-${b.date}`}
                      secondaryAction={
                        <Chip label={t(b.status)} color={statusColor(b.status)} />
                      }
                    >
                      <ListItemText
                        primary={
                          time ? `${formatDate(b.date)} ${time}` : formatDate(b.date)
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{t('news_and_events')}</span>
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
              title={t('next_available_slots')}
              icon={<EventAvailable color="primary" />}
            >
              <List sx={{ '& .MuiListItem-root:not(:last-child)': { mb: 1 } }}>
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
                          {t('book')}
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
                    <ListItemText primary={t('no_slots_available')} />
                  </ListItem>
                )}
              </List>
            </SectionCard>

            <SectionCard title={t('quick_actions')}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="contained"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/book-appointment')}
                >
                  {t('book_appointment')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/booking-history')}
                >
                  {t('reschedule')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/booking-history')}
                >
                  {t('cancel')}
                </Button>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
        <Dialog open={cancelId !== null} onClose={() => setCancelId(null)}>
          <DialogCloseButton onClose={() => setCancelId(null)} />
          <DialogTitle>{t('cancel_booking')}</DialogTitle>
          <DialogContent>
            <Typography>{t('cancel_booking_question')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              size="small"
              color="error"
              variant="contained"
              sx={{ textTransform: 'none' }}
              onClick={confirmCancel}
            >
              {t('cancel_booking')}
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
