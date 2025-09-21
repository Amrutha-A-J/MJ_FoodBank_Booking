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
  CircularProgress,
  Box,
  Fab,
} from '@mui/material';
import Announcement from '@mui/icons-material/Announcement';
import Add from '@mui/icons-material/Add';
import Download from '@mui/icons-material/Download';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  getMyVolunteerBookings,
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  updateVolunteerBookingStatus,
  getVolunteerStats,
  getVolunteerLeaderboard,
  resolveVolunteerBookingConflict,
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
import OverlapBookingDialog from '../../components/OverlapBookingDialog';
import type { ApiError } from '../../api/client';
import type { VolunteerBookingConflict } from '../../types';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import OnboardingModal from '../../components/OnboardingModal';
import { useAuth } from '../../hooks/useAuth';

function formatDateLabel(dateStr: string) {
  const d = toDate(dateStr);
  return formatReginaDate(d, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function VolunteerDashboard() {
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [availability, setAvailability] = useState<VolunteerRole[]>([]);
  const [contributionData, setContributionData] = useState<ContributionDatum[]>([]);
  const [topRoles, setTopRoles] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<'today' | 'week'>('today');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [events, setEvents] = useState<EventGroups>({ today: [], upcoming: [], past: [] });
  const [badges, setBadges] = useState<string[]>([]);
  const [stats, setStats] = useState<VolunteerStats>();
  const [leaderboard, setLeaderboard] = useState<{ rank: number; percentile: number }>();
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const [conflict, setConflict] = useState<VolunteerBookingConflict | null>(null);
  const [loadingCount, setLoadingCount] = useState(0);
  const startLoading = () => setLoadingCount(c => c + 1);
  const stopLoading = () => setLoadingCount(c => Math.max(c - 1, 0));
  const loading = loadingCount > 0;
  const navigate = useNavigate();
  const { userRole, cardUrl } = useAuth();

  useEffect(() => {
    startLoading();
    getMyVolunteerBookings()
      .then(data => {
        setBookings(data);
        const monthly: Record<string, { total: number; roles: Record<string, number> }> = {};
        const roleTotals: Record<string, number> = {};
        data
          .filter((b: VolunteerBooking) => b.status === 'completed')
          .forEach((b: VolunteerBooking) => {
            const d = toDate(b.date);
            const key = formatRegina(d, 'yyyy-MM');
            const role = b.role_name;
            if (!monthly[key]) monthly[key] = { total: 0, roles: {} };
            monthly[key].total++;
            monthly[key].roles[role] = (monthly[key].roles[role] ?? 0) + 1;
            roleTotals[role] = (roleTotals[role] ?? 0) + 1;
          });
        const top = Object.entries(roleTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);
        const agg = Object.entries(monthly)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, { total, roles }]) => {
            const dt = fromZonedTime(`${k}-01T12:00:00`, REGINA_TIMEZONE);
            const base: ContributionDatum = {
              month: formatRegina(dt, 'MMM yyyy'),
              total,
            };
            top.forEach(r => {
              base[r] = roles[r] ?? 0;
            });
            return base;
          });
        setTopRoles(top);
        setContributionData(agg);
      })
      .catch(() => {
        setBookings([]);
        setTopRoles([]);
        setContributionData([]);
        setSnackbarSeverity('error');
        setMessage('Failed to load bookings');
      })
      .finally(stopLoading);
  }, []);

  useEffect(() => {
    startLoading();
    getEvents()
      .then(data =>
        setEvents(data ?? { today: [], upcoming: [], past: [] }),
      )
      .catch(err => {
        console.error('Failed to load events', err);
        setEvents({ today: [], upcoming: [], past: [] });
        setSnackbarSeverity('error');
        setMessage('Failed to load events');
      })
      .finally(stopLoading);
  }, []);

  useEffect(() => {
    startLoading();
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
        setSnackbarSeverity('error');
        setMessage('Failed to load stats');
      })
      .finally(stopLoading);
  }, []);

  useEffect(() => {
    startLoading();
    getVolunteerLeaderboard()
      .then(setLeaderboard)
      .catch(() => {
        setLeaderboard(undefined);
        setSnackbarSeverity('error');
        setMessage('Failed to load leaderboard');
      })
      .finally(stopLoading);
  }, []);

  useEffect(() => {
    let active = true;
    let loadingActive = true;
    async function loadAvailability() {
      startLoading();
      try {
        const today = toDate();
        const days =
          dateMode === 'week'
            ? Array.from({ length: 7 }, (_, i) => {
                const d = toDate(today);
                d.setDate(d.getDate() + i);
                return d;
              })
            : [today];
        const requests = days.map(day =>
          getVolunteerRolesForVolunteer(formatRegina(day, 'yyyy-MM-dd')).catch(
            () => {
              if (!active) return [];
              setSnackbarSeverity('error');
              setMessage('Failed to load availability');
              return [];
            },
          ),
        );
        const results = await Promise.all(requests);
        if (!active) return;
        setAvailability(results.flat());
      } finally {
        if (loadingActive) {
          stopLoading();
          loadingActive = false;
        }
      }
    }
    loadAvailability();
    return () => {
      active = false;
      if (loadingActive) {
        stopLoading();
        loadingActive = false;
      }
    };
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

  const availableSlots = useMemo(() => {
    const now = toDate();
    const slots = availability
      .filter(a => a.status === 'available' && a.available > 0)
      .filter(s => toDate(`${s.date}T${s.start_time}`) > now);
    const activeBookings = bookings.filter(b => b.status === 'approved');
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
      setMessage('Shift booked');
      const latest = await getMyVolunteerBookings();
      setBookings(latest);
    } catch (e: unknown) {
      const err = e as ApiError;
      const details = err.details as VolunteerBookingConflict | undefined;
      if (err.status === 409 && details?.attempted && details?.existing) {
        setConflict(details);
      } else {
        setSnackbarSeverity('error');
        setMessage(err.message ?? 'Failed to request shift');
      }
    }
  }

  async function resolveConflict(choice: 'existing' | 'new') {
    if (!conflict) return;
    if (!conflict.existing.id) return;
    try {
      const booking = await resolveVolunteerBookingConflict(
        conflict.existing.id,
        conflict.attempted.role_id,
        conflict.attempted.date,
        choice,
      );
      setSnackbarSeverity('success');
      setMessage(
        choice === 'new' ? 'Booking replaced' : 'Existing booking kept',
      );
      if (choice === 'new') {
        setBookings(prev =>
          prev
            .filter(b => b.id !== conflict.existing.id)
            .concat({
              ...booking,
              role_name: conflict.attempted.role_name,
              start_time: conflict.attempted.start_time,
              end_time: conflict.attempted.end_time,
            }),
        );
      }
    } catch {
      setSnackbarSeverity('error');
      setMessage('Failed to resolve conflict');
    } finally {
      setConflict(null);
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
    <Page title="Volunteer Dashboard" sx={{ pb: 7 }}>
      <OnboardingModal
        storageKey="volunteerOnboarding"
        title="Welcome to the Volunteer Dashboard"
        body="See your upcoming shifts, track stats, and stay informed."
      />
      {cardUrl && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button
            size="large"
            variant="outlined"
            sx={{ textTransform: 'none' }}
            component="a"
            href={cardUrl}
            download
            startIcon={<Download />}
          >
            Download volunteer card
          </Button>
        </Stack>
      )}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}
      <Grid container spacing={2}>
        {contributionData.length > 0 ? (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="My Contribution Trend">
                <PersonalContributionChart data={contributionData} roles={topRoles} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <VolunteerGroupStatsCard stats={stats} />
            </Grid>
          </>
        ) : (
          <Grid size={{ xs: 12 }}>
            <VolunteerGroupStatsCard stats={stats} />
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
                      size="large"
                      variant="outlined"
                      sx={{ textTransform: 'none' }}
                      onClick={() => navigate('/volunteer/schedule')}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="large"
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

            <SectionCard title="Profile & Training">
              <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                {roleOptions.map(([id, name]) => (
                  <Chip key={id} label={name} />
                ))}
              </Stack>
            </SectionCard>
            <SectionCard
              title={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  My Stats
                </Stack>
              }
            >
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

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard title="News & Events" icon={<Announcement color="primary" />}>
              <EventList events={[...events.today, ...events.upcoming]} limit={5} />
            </SectionCard>

            <SectionCard title="Quick Actions">
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="large"
                  variant="contained"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/volunteer/schedule')}
                >
                  Request a shift
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={cancelNext}
                  disabled={!nextShift}
                >
                  Cancel upcoming
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate('/volunteer/schedule')}
                  disabled={!nextShift}
                >
                  Reschedule
                </Button>
                {userRole === 'shopper' && (
                  <Button
                    size="large"
                    variant="outlined"
                    sx={{ textTransform: 'none' }}
                    component={RouterLink}
                    to="/book-appointment"
                  >
                    Book Shopping Appointment
                  </Button>
                )}
              </Stack>
            </SectionCard>

            <SectionCard title="Available in My Roles">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent={{ xs: 'flex-start', md: 'space-between' }}
                flexWrap={{ sm: 'wrap', md: 'nowrap' }}
                rowGap={1.5}
                mb={2}
              >
                <ToggleButtonGroup
                  size="medium"
                  value={dateMode}
                  exclusive
                  onChange={(_, v) => v && setDateMode(v)}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  <ToggleButton value="today">Today</ToggleButton>
                  <ToggleButton value="week">Week</ToggleButton>
                </ToggleButtonGroup>
                <FormControl
                  size="medium"
                  sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' } }}
                >
                  <InputLabel id="role-filter-label">Role</InputLabel>
                  <Select
                    labelId="role-filter-label"
                    label="Role"
                    value={roleFilter}
                    onChange={e => setRoleFilter(String(e.target.value))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {roleOptions.map(([id, name]) => (
                      <MenuItem key={id} value={String(id)}>
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
                    sx={{ pl: 0 }}
                    secondaryAction={
                      <Button
                        size="large"
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
      {conflict && (
        <OverlapBookingDialog
          open
          attempted={conflict.attempted}
          existing={conflict.existing}
          onClose={() => setConflict(null)}
          onResolve={resolveConflict}
        />
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={snackbarSeverity}
      />
      <Fab
        color="primary"
        aria-label="request shift"
        onClick={() => navigate('/volunteer/schedule')}
        sx={{ position: 'fixed', bottom: 72, right: 16 }}
      >
        <Add />
      </Fab>
      <VolunteerBottomNav />
    </Page>
  );
}
