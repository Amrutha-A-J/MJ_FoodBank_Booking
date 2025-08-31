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
import InfoTooltip from '../../components/InfoTooltip';
import Announcement from '@mui/icons-material/Announcement';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const [conflict, setConflict] = useState<{ attempted: any; existing: any } | null>(
    null,
  );
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    getMyVolunteerBookings()
      .then(data => {
        setBookings(data);
        const monthly: Record<string, { total: number; roles: Record<string, number> }> = {};
        const roleTotals: Record<string, number> = {};
        data
          .filter(b => b.status === 'completed')
          .forEach(b => {
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
      const booking = await requestVolunteerBooking(role.id, role.date);
      setSnackbarSeverity('success');
      setMessage('Shift booked');
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
      const err = e as ApiError;
      const details = err.details as any;
      if (err.status === 409 && details?.attempted && details?.existing) {
        setConflict({ attempted: details.attempted, existing: details.existing });
      } else {
        setSnackbarSeverity('error');
        setMessage(err.message ?? 'Failed to request shift');
      }
    }
  }

  async function resolveConflict(choice: 'existing' | 'new') {
    if (!conflict) return;
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
    <Page title="Volunteer Dashboard">
      <Grid container spacing={2}>
        {contributionData.length > 0 ? (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="My Contribution Trend">
                <PersonalContributionChart data={contributionData} roles={topRoles} />
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

            <SectionCard title={t('news_and_events')} icon={<Announcement color="primary" />}>
              <EventList events={[...events.today, ...events.upcoming]} limit={5} />
            </SectionCard>

            <SectionCard title="Profile & Training">
              <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                {roleOptions.map(([id, name]) => (
                  <Chip key={id} label={name} />
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
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

            <SectionCard
              title={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  My Stats
                  <InfoTooltip
                    title={t('tooltip_volunteer_stats')}
                  />
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
    </Page>
  );
}
