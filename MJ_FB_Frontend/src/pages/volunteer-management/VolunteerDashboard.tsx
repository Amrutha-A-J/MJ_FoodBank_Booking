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
  getVolunteerLeaderboard,
  type VolunteerStats,
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
import { getNextEncouragement } from '../../utils/appreciationMessages';
import VolunteerGroupStatsCard from '../../components/dashboard/VolunteerGroupStatsCard';
import PersonalContributionChart, {
  type ContributionDatum,
} from '../../components/dashboard/PersonalContributionChart';

function formatDateLabel(dateStr: string) {
  const d = toDate(dateStr);
  return formatReginaDate(d, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function VolunteerDashboard() {
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [availability, setAvailability] = useState<VolunteerRole[]>([]);
  const [contributionData, setContributionData] = useState<ContributionDatum[]>([]);
  const [dateMode, setDateMode] = useState<'today' | 'week'>('today');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [badges, setBadges] = useState<string[]>([]);
  const [stats, setStats] = useState<VolunteerStats>();
  const [leaderboard, setLeaderboard] = useState<{ rank: number; percentile: number }>();
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const navigate = useNavigate();

  useEffect(() => {
    getMyVolunteerBookings()
      .then(data => {
        setBookings(data);
        const counts: Record<string, number> = {};
        data
          .filter(b => b.status === 'approved')
          .forEach(b => {
            const d = toDate(b.date);
            const key = formatRegina(d, 'yyyy-MM');
            counts[key] = (counts[key] ?? 0) + 1;
          });
        const agg = Object.keys(counts)
          .sort()
          .map(k => {
            const [y, m] = k.split('-');
            const dt = new Date(Number(y), Number(m) - 1, 1);
            return { month: formatRegina(dt, 'MMM yyyy'), count: counts[k] };
          });
        setContributionData(agg);
      })
      .catch(() => {
        setBookings([]);
        setContributionData([]);
      });
  }, []);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    getVolunteerStats()
      .then(data => {
        setBadges(data.badges ?? []);
        setStats(data);
        if (data.totalShifts > 0) {
          const msg =
            data.milestoneText ??
            `${getNextEncouragement()} This month you've helped serve ${data.monthFamiliesServed} families and handle ${data.monthPoundsHandled} lbs.`;
          setSnackbarSeverity(data.milestoneText ? 'info' : 'success');
          setMessage(msg);
        } else {
          setMessage('');
        }
      })
      .catch(() => {
        setBadges([]);
        setStats(undefined);
      });
  }, []);

  useEffect(() => {
    getVolunteerLeaderboard()
      .then(setLeaderboard)
      .catch(() => setLeaderboard(undefined));
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
    const now = toDate();
    const slots = availability
      .filter(a => a.status === 'available' && a.available > 0)
      .filter(s => toDate(`${s.date}T${s.start_time}`) > now);
    const activeBookings = bookings.filter(b =>
      ['pending', 'approved'].includes(b.status),
    );
    const filtered = slots.filter(
      s =>
        !activeBookings.some(
          b =>
            b.role_id === s.id &&
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
      const booking = await requestVolunteerBooking(role.id, role.date);
      setSnackbarSeverity('success');
      setMessage('Request submitted');
      setBookings(prev => [
        ...prev,
        {
          ...booking,
          role_name: role.name,
          start_time: role.start_time,
          end_time: role.end_time,
          category_name: role.category_name,
        },
      ]);
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
        {contributionData.length > 0 ? (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="My Contribution Trend">
                <PersonalContributionChart data={contributionData} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <VolunteerGroupStatsCard />
            </Grid>
          </>
        ) : (
          <Grid size={{ xs: 12 }}>
            <VolunteerGroupStatsCard />
          </Grid>
        )}
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
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
                  <ListItem
                    key={`${r.id}-${r.date}`}
                    disableGutters
                    secondaryAction={
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ textTransform: 'none' }}
                        onClick={() => request(r)}
                      >
                        Request
                      </Button>
                    }
                  >
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

            <SectionCard title="News & Events" icon={<Announcement color="primary" />}>
              <EventList events={[...events.today, ...events.upcoming]} limit={5} />
            </SectionCard>

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
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
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

            <SectionCard title="My Stats">
              <Stack spacing={2}>
                {badges.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {badges.map(b => (
                      <Chip key={b} label={b} />
                    ))}
                  </Stack>
                ) : (
                  <Typography>No badges earned yet</Typography>
                )}
                {stats && stats.totalShifts > 0 && (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Stack>
                        <Typography variant="body2" color="text.secondary">
                          Lifetime Hours
                        </Typography>
                        <Typography variant="h6">{stats.lifetimeHours}</Typography>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Stack>
                        <Typography variant="body2" color="text.secondary">
                          Hours This Month
                        </Typography>
                        <Typography variant="h6">{stats.monthHours}</Typography>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Stack>
                        <Typography variant="body2" color="text.secondary">
                          Total Shifts
                        </Typography>
                        <Typography variant="h6">{stats.totalShifts}</Typography>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Stack>
                        <Typography variant="body2" color="text.secondary">
                          Current Streak
                        </Typography>
                        <Typography variant="h6">
                          {stats.currentStreak} week{stats.currentStreak === 1 ? '' : 's'}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                )}
                {leaderboard && (
                  <Typography variant="h6">
                    {`You're in the top ${Math.round(leaderboard.percentile)}%!`}
                  </Typography>
                )}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>

        {stats?.milestone && (
          <Grid size={{ xs: 12 }}>
            <SectionCard title="Milestone">
              <Typography>{stats.milestoneText}</Typography>
            </SectionCard>
          </Grid>
        )}
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
