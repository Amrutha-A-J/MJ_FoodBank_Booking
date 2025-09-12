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
import { getMyAgencyClients } from '../../api/agencies';
import {
  getBookings,
  getSlots,
  getHolidays,
  cancelBooking,
} from '../../api/bookings';
import { getEvents, type EventGroups } from '../../api/events';
import type { ApiError } from '../../api/client';
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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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

export default function AgencyDashboard() {
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
    getMyAgencyClients()
      .then(data => {
        interface AgencyClientData {
          id?: number;
          client_id?: number;
        }
        const ids = Array.isArray(data)
          ? data.map((c: AgencyClientData) => c.id ?? c.client_id!)
          : [];
        if (!ids.length) return [];
        return getBookings({ clientIds: ids });
      })
      .then(res => setBookings(Array.isArray(res) ? res : []))
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
      setBookings(b => b.filter(x => x.id !== cancelId));
      setMessage('Booking cancelled');
      setSnackbarSeverity('success');
    } catch (err: unknown) {
      const e = err as ApiError | undefined;
      setMessage(e?.message || 'Failed to cancel booking');
      setSnackbarSeverity('error');
    }
    setCancelId(null);
  }

  return (
    <Page title="Agency Dashboard">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard title="Next Booking" icon={<EventAvailable color="primary" />}>
              {next ? (
                <List>
                  <ListItem>
                    <ListItemText
                      primary={`${formatDate(next.date)} ${formatTime(next.start_time || '')}`}
                      secondary={next.user_name}
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        
                        variant="outlined"
                        sx={{ textTransform: 'none' }}
                        onClick={() => setCancelId(next.id)}
                      >
                        Cancel
                      </Button>

                      {next.reschedule_token && (
                        <Button
                          
                          variant="contained"
                          sx={{ textTransform: 'none' }}
                          onClick={() =>
                            navigate(`/reschedule/${next.reschedule_token}`)
                          }
                        >
                          Reschedule
                        </Button>
                      )}
                    </Stack>
                  </ListItem>
                </List>
              ) : (
                <Typography>No upcoming bookings</Typography>
              )}
            </SectionCard>

          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard title={t('news_and_events')} icon={<Announcement color="primary" />}>
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

            <SectionCard title="Next Available Slots" icon={<EventAvailable color="primary" />}>
              <List>
                {nextSlots.length ? (
                  nextSlots.map(s => (
                    <ListItem
                      key={`${s.date}-${s.slot.id}`}
                      secondaryAction={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Button
                            
                            variant="contained"
                            sx={{ textTransform: 'none' }}
                            onClick={() => navigate('/agency/book')}
                          >
                            Book
                          </Button>

                        </Stack>
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

            <SectionCard title="Quick Actions">
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  
                  variant="contained"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/agency/book')}
                >
                  Book Appointment
                </Button>
                <Button
                  
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/agency/history')}
                >
                  Reschedule
                </Button>
                <Button
                  
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/agency/history')}
                >
                  Cancel
                </Button>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={12}>
          <SectionCard title="Recent Bookings" icon={<History color="primary" />}>
            <List>
              {history.slice(0, 3).map(b => {
                const time = b.start_time ? formatTime(b.start_time) : '';
                return (
                  <ListItem
                    key={b.id}
                    secondaryAction={
                      <Chip label={b.status} color={statusColor(b.status)} />
                    }
                  >
                    <ListItemText
                      primary={
                        time
                          ? `${formatDate(b.date)} ${time}`
                          : formatDate(b.date)
                      }
                      secondary={b.user_name}
                    />
                  </ListItem>
                );
              })}
            </List>
          </SectionCard>
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
