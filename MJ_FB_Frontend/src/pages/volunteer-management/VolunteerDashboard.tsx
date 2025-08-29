import { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  Stack,
  Chip,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import Announcement from '@mui/icons-material/Announcement';
import { useNavigate } from 'react-router-dom';
import {
  getMyVolunteerBookings,
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  updateVolunteerBookingStatus,
  getVolunteerStats,
} from '../../api/volunteers';
import { getEvents, type EventGroups } from '../../api/events';
import type { VolunteerBooking, VolunteerRole } from '../../types';
import {
  formatTime,
  formatReginaDate,
  formatRegina,
  REGINA_TIMEZONE,
} from '../../utils/time';
import { fromZonedTime } from 'date-fns-tz';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import Page from '../../components/Page';
import type { AlertColor } from '@mui/material';
import SectionCard from '../../components/dashboard/SectionCard';
import EventList from '../../components/EventList';
import { toDate } from '../../utils/date';

function formatDateLabel(dateStr: string) {
  const d = toDate(dateStr);
  return formatReginaDate(d, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const ENCOURAGEMENTS = [
  'Thanks for volunteering!',
  'Your help makes a difference!',
  'We appreciate your support!',
];

export default function VolunteerDashboard() {
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [availability, setAvailability] = useState<VolunteerRole[]>([]);
  const [dateMode, setDateMode] = useState<'today' | 'week'>('today');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const navigate = useNavigate();

  useEffect(() => {
    getVolunteerStats()
      .then(stats => {
        if (stats.message) {
          setSnackbarSeverity('info');
          setMessage(stats.message);
        } else {
          const idx = Math.floor(Math.random() * ENCOURAGEMENTS.length);
          setSnackbarSeverity('info');
          setMessage(ENCOURAGEMENTS[idx]);
        }
      })
      .catch(() => {
        const idx = Math.floor(Math.random() * ENCOURAGEMENTS.length);
        setSnackbarSeverity('info');
        setMessage(ENCOURAGEMENTS[idx]);
      });
  }, []);

  useEffect(() => {
    getMyVolunteerBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      const today = toDate();
      const days =
        dateMode === 'week'
          ? Array.from({ length: 7 }, (_, i) => {
              const d = toDate(today);
              d.setDate(d.getDate() + i);
              return d;
            })
          : [today];
      const all: VolunteerRole[] = [];
      for (const day of days) {
        const ds = formatRegina(day, 'yyyy-MM-dd');
        try {
          const roles = await getVolunteerRolesForVolunteer(ds);
          all.push(...roles);
        } catch {
          // ignore
        }
      }
      setAvailability(all);
    }
    loadAvailability();
  }, [dateMode]);

  const nextShift = useMemo(() => {
  const now = toDate();
    const upcoming = bookings
      .filter(b => b.status === 'approved')
      .filter(b => toDate(`${b.date}T${b.start_time}`) >= now)
      .sort(
        (a, b) =>
          toDate(`${a.date}T${a.start_time}`).getTime() -
          toDate(`${b.date}T${b.start_time}`).getTime(),
      );
    return upcoming[0];
  }, [bookings]);

  const pending = useMemo(
    () => bookings.filter(b => b.status === 'pending'),
    [bookings],
  );

  const availableSlots = useMemo(() => {
    const slots = availability.filter(
      a => a.status === 'available' && a.available > 0,
    );
    const activeBookings = bookings.filter(b =>
      ['pending', 'approved'].includes(b.status),
    );
    const filtered = slots.filter(
      s =>
        !activeBookings.some(
          b =>
            b.role_id === s.role_id &&
            b.date === s.date &&
            b.start_time === s.start_time &&
            b.end_time === s.end_time,
        ),
    );
    return roleFilter
      ? filtered.filter(s => String(s.role_id) === roleFilter)
      : filtered;
  }, [availability, roleFilter, bookings]);

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>();
    availability.forEach(r => map.set(String(r.role_id), r.name));
    return Array.from(map.entries());
  }, [availability]);

  async function request(role: VolunteerRole) {
    try {
      await requestVolunteerBooking(role.id, role.date);
      setSnackbarSeverity('success');
      setMessage('Request submitted');
      const data = await getMyVolunteerBookings();
      setBookings(data);
    } catch (e: unknown) {
      setSnackbarSeverity('error');
      if (typeof e === 'object' && e && 'message' in e) {
        setMessage((e as { message?: string }).message ?? 'Failed to request shift');
      } else {
        setMessage('Failed to request shift');
      }
    }
  }

  async function cancelNext() {
    if (!nextShift) return;
    try {
      await updateVolunteerBookingStatus(nextShift.id, 'cancelled');
      setSnackbarSeverity('success');
      setMessage('Booking cancelled');
      const data = await getMyVolunteerBookings();
      setBookings(data);
    } catch {
      setSnackbarSeverity('error');
      setMessage('Failed to cancel booking');
    }
  }

  return (
    <Page title="Volunteer Dashboard">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="My Next Shift">
            {nextShift ? (
              <Stack spacing={1}>
                <Typography>
                  {`${nextShift.role_name} • ${formatDateLabel(nextShift.date)} ${formatTime(nextShift.start_time)}-${formatTime(nextShift.end_time)}`}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate('/volunteer/schedule')}
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={cancelNext}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Typography>No upcoming shifts — Request one</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Pending Requests">
            <List>
              {pending.map(p => (
                <ListItem key={p.id} disableGutters>
                  <ListItemText
                    primary={`${p.role_name} • ${formatDateLabel(p.date)} ${formatTime(p.start_time)}-${formatTime(p.end_time)}`}
                  />
                  <Chip label="Pending" color="warning" size="small" />
                </ListItem>
              ))}
              {pending.length === 0 && (
                <Typography>No pending requests</Typography>
              )}
            </List>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Available in My Roles">
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <ToggleButtonGroup
                size="small"
                value={dateMode}
                exclusive
                onChange={(_, v) => v && setDateMode(v)}
              >
                <ToggleButton value="today">Today</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
              </ToggleButtonGroup>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="role-filter-label">Role</InputLabel>
                <Select
                  labelId="role-filter-label"
                  label="Role"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {roleOptions.map(([id, name]) => (
                    <MenuItem key={id} value={id}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <List>
              {availableSlots.map(r => (
                <ListItem key={`${r.id}-${r.date}`} disableGutters secondaryAction={
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={() => request(r)}
                  >
                    Request
                  </Button>
                }>
                  <ListItemText
                    primary={`${r.name} • ${formatDateLabel(r.date)} ${formatTime(r.start_time)}-${formatTime(r.end_time)} • ${r.available} volunteer${r.available === 1 ? '' : 's'} needed`}
                  />
                </ListItem>
              ))}
              {availableSlots.length === 0 && (
                <Typography>No available shifts</Typography>
              )}
            </List>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Quick Actions">
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="contained"
                sx={{ textTransform: 'none' }}
                onClick={() => navigate('/volunteer/schedule')}
              >
                Request a shift
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none' }}
                onClick={cancelNext}
                disabled={!nextShift}
              >
                Cancel upcoming
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none' }}
                onClick={() => navigate('/volunteer/schedule')}
                disabled={!nextShift}
              >
                Reschedule
              </Button>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="News & Events" icon={<Announcement color="primary" />}>
            <EventList events={[...events.today, ...events.upcoming]} limit={5} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Profile & Training">
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
              {roleOptions.map(([id, name]) => (
                <Chip key={id} label={name} />
              ))}
            </Stack>
            <Button
              size="small"
              variant="text"
              sx={{ textTransform: 'none' }}
              onClick={() => navigate('/profile')}
            >
              Update trained roles
            </Button>
          </SectionCard>
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={snackbarSeverity}
      />
    </Page>
  );
}
