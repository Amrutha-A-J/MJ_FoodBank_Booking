import { useEffect, useState, type ReactNode } from 'react';
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
} from '@mui/material';
import CalendarToday from '@mui/icons-material/CalendarToday';
import People from '@mui/icons-material/People';
import CancelIcon from '@mui/icons-material/Cancel';
import EventAvailable from '@mui/icons-material/EventAvailable';
import Announcement from '@mui/icons-material/Announcement';
import { getBookings, getSlotsRange } from '../../api/bookings';
import type { Role, Booking } from '../../types';
import { formatTime } from '../../utils/time';
import EntitySearch from '../EntitySearch';
import { getEvents, type EventGroups } from '../../api/events';
import EventList from '../EventList';
import SectionCard from './SectionCard';
import VolunteerCoverageCard from './VolunteerCoverageCard';
import { useTranslation } from 'react-i18next';

export interface DashboardProps {
  role: Role;
  masterRoleFilter?: string[];
}

interface StatProps {
  icon: ReactNode;
  label: string;
  value: string | number;
}

const Stat = ({ icon, label, value }: StatProps) => (
  <Stack direction="row" spacing={1} alignItems="center">
    {icon}
    <Stack>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6">{value}</Typography>
    </Stack>
  </Stack>
);

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateStr: string) {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLocalDate(date: Date) {
  return date.toLocaleDateString('en-CA');
}

function StaffDashboard({ masterRoleFilter }: { masterRoleFilter?: string[] }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [schedule, setSchedule] = useState<{ day: string; open: number }[]>([]);
  const [events, setEvents] = useState<EventGroups>({
    today: [],
    upcoming: [],
    past: [],
  });
  const [searchType, setSearchType] = useState<'user' | 'volunteer'>('user');
  const navigate = useNavigate();

  useEffect(() => {
    getBookings().then(setBookings).catch(() => {});
    getEvents().then(setEvents).catch(() => {});

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const startStr = formatLocalDate(start);

    getSlotsRange(startStr, 7)
      .then(days =>
        days.map(d => {
          const date = parseLocalDate(d.date);
          const dayOfWeek = date.getDay();
          const open =
            dayOfWeek === 0 || dayOfWeek === 6
              ? 0
              : d.slots.reduce((sum, s) => sum + (s.available ?? 0), 0);
          return {
            day: date.toLocaleDateString(undefined, {
              weekday: 'short',
            }),
            open,
          };
        }),
      )
      .then(setSchedule)
      .catch(() => {});
  }, []);

  const todayStr = formatLocalDate(new Date());
  const cancellations = bookings.filter(b => b.status === 'cancelled');
  const stats = {
    appointments: bookings.filter(
      b =>
        b.status === 'approved' &&
        formatLocalDate(parseLocalDate(b.date)) === todayStr,
    ).length,
    volunteers: volunteerCount,
    cancellations: cancellations.filter(
      b => formatLocalDate(parseLocalDate(b.date)) === todayStr,
    ).length,
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <SectionCard title="Today at a Glance">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stat
                    icon={<CalendarToday color="primary" />}
                    label="Appointments Today"
                    value={stats.appointments}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stat
                    icon={<People color="primary" />}
                    label="Volunteers Scheduled"
                    value={stats.volunteers}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stat
                    icon={<CancelIcon color="error" />}
                    label="Cancellations"
                    value={stats.cancellations}
                  />
                </Grid>
              </Grid>
            </SectionCard>
          </Grid>
          <Grid size={12}>
            <VolunteerCoverageCard
              masterRoleFilter={masterRoleFilter}
              onCoverageLoaded={data =>
                setVolunteerCount(data.reduce((sum, c) => sum + c.filled, 0))
              }
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <SectionCard title="Pantry Schedule (This Week)">
              <Grid container columns={7} spacing={2}>
                {schedule.map((day, i) => (
                  <Grid size={1} key={i}>
                    <Stack alignItems="center" spacing={1}>
                      <Typography variant="body2">{day.day}</Typography>
                      <Chip
                        label={day.open > 0 ? `Open: ${day.open}` : 'Closed'}
                        color={day.open > 0 ? 'success' : 'default'}
                      />
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Grid>
          <Grid size={12}>
            <SectionCard title="Quick Search">
              <Stack spacing={2}>
                <EntitySearch
                  type={searchType}
                  placeholder="Search"
                  onSelect={res => {
                    if (searchType === 'user') {
                      navigate(
                        `/pantry/client-management?tab=history&id=${res.id}&name=${encodeURIComponent(
                          res.name,
                        )}&clientId=${res.client_id}`,
                      );
                    } else {
                      navigate(
                        `/volunteer-management/search?id=${res.id}&name=${encodeURIComponent(
                          res.name,
                        )}`,
                      );
                    }
                  }}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={searchType === 'user' ? 'contained' : 'outlined'}
                    sx={{ textTransform: 'none' }}
                    onClick={() => setSearchType('user')}
                  >
                    Find Client
                  </Button>
                  <Button
                    size="small"
                    variant={searchType === 'volunteer' ? 'contained' : 'outlined'}
                    sx={{ textTransform: 'none' }}
                    onClick={() => setSearchType('volunteer')}
                  >
                    Find Volunteer
                  </Button>
                </Stack>
              </Stack>
            </SectionCard>
          </Grid>
          <Grid size={12}>
            <SectionCard title="News & Events" icon={<Announcement color="primary" />}>
              <EventList
                events={[...events.today, ...events.upcoming]}
                limit={5}
              />
            </SectionCard>
          </Grid>
          <Grid size={12}>
            <SectionCard title="Recent Cancellations">
              <List>
                {cancellations.slice(0, 5).map(c => (
                  <ListItem key={c.id}>
                    <ListItemText
                      primary={`${c.user_name || 'Unknown'} - ${formatTime(
                        c.start_time || '',
                      )}`}
                    />
                  </ListItem>
                ))}
              </List>
            </SectionCard>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

function UserDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slotOptions, setSlotOptions] = useState<string[]>([]);
  const [events, setEvents] = useState<EventGroups>({
    today: [],
    upcoming: [],
    past: [],
  });

  useEffect(() => {
    getBookings().then(setBookings).catch(() => {});

    const todayStr = formatLocalDate(new Date());
    getSlotsRange(todayStr, 5)
      .then(days => {
        const merged = days.flatMap(d =>
          d.slots
            .filter(s => (s.available ?? 0) > 0)
            .map(s =>
              `${formatDate(d.date)} ${formatTime(s.startTime)}-${formatTime(s.endTime)}`,
            ),
        );
        setSlotOptions(merged.slice(0, 3));
      })
      .catch(() => {});

    getEvents().then(setEvents).catch(() => {});
  }, []);

  const appointments = bookings.filter(b => b.status === 'approved');
  const { t } = useTranslation();

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title={t('my_upcoming_appointments')} icon={<EventAvailable color="primary" />}>
          <List>
            {appointments.map(a => (
              <ListItem
                key={a.id}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
                      {t('cancel')}
                    </Button>
                    <Button size="small" variant="contained" sx={{ textTransform: 'none' }}>
                      {t('reschedule')}
                    </Button>
                  </Stack>
                }
              >
                <ListItemText
                  primary={`${formatDate(a.date)} ${formatTime(a.start_time || '')}`}
                />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title={t('next_available_slots')} icon={<EventAvailable color="primary" />}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {slotOptions.map((s, i) => (
              <Button
                key={i}
                size="small"
                variant="contained"
                sx={{ textTransform: 'none', m: 0.5 }}
              >
                {s}
              </Button>
            ))}
          </Stack>
        </SectionCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title={t('notices')} icon={<Announcement color="primary" />}> 
          <EventList
            events={[...events.today, ...events.upcoming]}
            limit={5}
          />
        </SectionCard>
      </Grid>
      <Grid size={12}>
        <SectionCard title={t('quick_actions')}>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" sx={{ textTransform: 'none' }}>
              {t('book')}
            </Button>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
              {t('reschedule')}
            </Button>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
              {t('cancel')}
            </Button>
          </Stack>
        </SectionCard>
      </Grid>
    </Grid>
  );
}

export default function Dashboard({ role, masterRoleFilter }: DashboardProps) {
  if (role === 'staff')
    return <StaffDashboard masterRoleFilter={masterRoleFilter} />;
  return <UserDashboard />;
}

