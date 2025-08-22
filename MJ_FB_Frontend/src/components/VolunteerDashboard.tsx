import { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
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
import { useNavigate } from 'react-router-dom';
import {
  getMyVolunteerBookings,
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  updateVolunteerBookingStatus,
} from '../api/volunteers';
import type { VolunteerBooking, VolunteerRole } from '../types';
import { formatTime } from '../utils/time';
import FeedbackSnackbar from './FeedbackSnackbar';
import Page from './Page';

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function VolunteerDashboard({ token }: { token: string }) {
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [availability, setAvailability] = useState<VolunteerRole[]>([]);
  const [dateMode, setDateMode] = useState<'today' | 'week'>('today');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getMyVolunteerBookings(token)
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [token]);

  useEffect(() => {
    async function loadAvailability() {
      const today = new Date();
      const days =
        dateMode === 'week'
          ? Array.from({ length: 7 }, (_, i) => {
              const d = new Date(today);
              d.setDate(d.getDate() + i);
              return d;
            })
          : [today];
      const all: VolunteerRole[] = [];
      for (const day of days) {
        const ds = day.toISOString().split('T')[0];
        try {
          const roles = await getVolunteerRolesForVolunteer(token, ds);
          all.push(...roles);
        } catch {
          // ignore
        }
      }
      setAvailability(all);
    }
    loadAvailability();
  }, [token, dateMode]);

  const nextShift = useMemo(() => {
    const now = new Date();
    const upcoming = bookings
      .filter(b => b.status === 'approved')
      .filter(b => new Date(`${b.date}T${b.start_time}`) >= now)
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.start_time}`).getTime() -
          new Date(`${b.date}T${b.start_time}`).getTime(),
      );
    return upcoming[0];
  }, [bookings]);

  const pending = useMemo(
    () => bookings.filter(b => b.status === 'pending' || b.status === 'submitted'),
    [bookings],
  );

  const availableSlots = useMemo(() => {
    const slots = availability.filter(a => a.status === 'available' && a.available > 0);
    return roleFilter ? slots.filter(s => String(s.role_id) === roleFilter) : slots;
  }, [availability, roleFilter]);

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>();
    availability.forEach(r => map.set(String(r.role_id), r.name));
    return Array.from(map.entries());
  }, [availability]);

  async function request(role: VolunteerRole) {
    try {
      await requestVolunteerBooking(token, role.id, role.date);
      setMessage('Request submitted');
      const data = await getMyVolunteerBookings(token);
      setBookings(data);
    } catch {
      setMessage('Failed to request shift');
    }
  }

  async function cancelNext() {
    if (!nextShift) return;
    try {
      await updateVolunteerBookingStatus(token, nextShift.id, 'cancelled');
      setMessage('Booking cancelled');
      const data = await getMyVolunteerBookings(token);
      setBookings(data);
    } catch {
      setMessage('Failed to cancel booking');
    }
  }

  return (
    <Page title="Volunteer Dashboard">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardHeader title="My Next Shift" />
            <CardContent>
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardHeader title="Pending Requests" />
            <CardContent>
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardHeader title="Available in My Roles" />
            <CardContent>
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
                      primary={`${r.name} • ${formatDateLabel(r.date)} ${formatTime(r.start_time)}-${formatTime(r.end_time)} • ${r.available} spots left`}
                    />
                  </ListItem>
                ))}
                {availableSlots.length === 0 && (
                  <Typography>No available shifts</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardHeader title="Quick Actions" />
            <CardContent>
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardHeader title="Announcements" />
            <CardContent>
              <Typography>No announcements</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardHeader title="Profile & Training" />
            <CardContent>
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity="info"
      />
    </Page>
  );
}

