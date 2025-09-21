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
  Box,
} from '@mui/material';
import CalendarToday from '@mui/icons-material/CalendarToday';
import People from '@mui/icons-material/People';
import CancelIcon from '@mui/icons-material/Cancel';
import EventAvailable from '@mui/icons-material/EventAvailable';
import Announcement from '@mui/icons-material/Announcement';
import { getBookings, getSlotsRange } from '../../api/bookings';
import { getVolunteerBookings } from '../../api/volunteers';
import type { Role, Booking, VolunteerBooking, SlotsByDate } from '../../types';
import type { VisitStat } from '../../api/clientVisits';
import { getPantryMonthly } from '../../api/pantryAggregations';
import {
  formatTime,
  formatReginaDate,
  REGINA_TIMEZONE,
} from '../../utils/time';
import { formatLocaleDate, toDate } from '../../utils/date';
import EntitySearch from '../EntitySearch';
import { getEvents, type EventGroups } from '../../api/events';
import EventList from '../EventList';
import SectionCard from './SectionCard';
import VolunteerCoverageCard from './VolunteerCoverageCard';
import ClientVisitTrendChart from './ClientVisitTrendChart';
import ClientVisitBreakdownChart from './ClientVisitBreakdownChart';
import PantryQuickLinks from '../PantryQuickLinks';
import { useBreadcrumbActions } from '../layout/MainLayout';

export interface DashboardProps {
  role: Role;
  masterRoleFilter?: string[];
  showPantryQuickLinks?: boolean;
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

function StaffDashboard({ masterRoleFilter }: { masterRoleFilter?: string[] }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [volBookings, setVolBookings] = useState<VolunteerBooking[]>([]);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [visitStats, setVisitStats] = useState<VisitStat[]>([]);
  const [events, setEvents] = useState<EventGroups>({
    today: [],
    upcoming: [],
    past: [],
  });
  const [searchType, setSearchType] = useState<'user' | 'volunteer'>('user');
  const navigate = useNavigate();

  useEffect(() => {
    getBookings()
      .then(b => setBookings(Array.isArray(b) ? b : [b]))
      .catch(() => {});
    getVolunteerBookings()
      .then(b => setVolBookings(Array.isArray(b) ? b : [b]))
      .catch(() => setVolBookings([]));
    getEvents()
      .then(data =>
        setEvents(data ?? { today: [], upcoming: [], past: [] }),
      )
      .catch(() =>
        setEvents({ today: [], upcoming: [], past: [] }),
      );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    interface PantryMonthlyRow {
      month: number;
      orders: number;
      adults: number;
      children: number;
    }

    Promise.all([
      getPantryMonthly(currentYear, currentMonth),
      getPantryMonthly(currentYear - 1, currentMonth),
    ])
      .then(([curr, prev]) => {
        const prevRows = Array.isArray(prev)
          ? (prev as PantryMonthlyRow[])
          : [];
        const currRows = Array.isArray(curr)
          ? (curr as PantryMonthlyRow[])
          : [];
        const combined = [
          ...prevRows.map(r => ({ ...r, year: currentYear - 1 })),
          ...currRows.map(r => ({ ...r, year: currentYear })),
        ];
        const filtered = combined.filter(
          r => r.year < currentYear || r.month <= currentMonth,
        );
        const minKey = currentYear * 12 + currentMonth - 11;
        const stats: VisitStat[] = filtered
          .filter(r => r.year * 12 + r.month >= minKey)
          .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
          .map(r => ({
            month: `${r.year}-${String(r.month).padStart(2, '0')}`,
            clients: r.orders,
            adults: r.adults,
            children: r.children,
          }));
        setVisitStats(stats);
      })
      .catch(() => setVisitStats([]));
  }, []);

  const todayStr = formatReginaDate(new Date());
  const cancellations = bookings.filter(b => b.status === 'cancelled');
  const volCancellations = volBookings.filter(b => b.status === 'cancelled');
  const todaysVolunteerCancellations = volCancellations.filter(
    b => formatReginaDate(toDate(b.date)) === todayStr,
  );
  const stats = {
    appointments: bookings.filter(
      b =>
        b.status === 'approved' &&
        formatReginaDate(toDate(b.date)) === todayStr,
    ).length,
    volunteers: volunteerCount,
    cancellations:
      cancellations.filter(
        b => formatReginaDate(toDate(b.date)) === todayStr,
      ).length +
      todaysVolunteerCancellations.length,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gridAutoFlow: 'row dense',
          gap: 2,
          flex: 1,
        }}
      >
        <SectionCard title="Today at a Glance" sx={{ order: 0 }}>
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
      <VolunteerCoverageCard
        masterRoleFilter={masterRoleFilter}
        onCoverageLoaded={data =>
          setVolunteerCount(data.reduce((sum, c) => sum + c.filled, 0))
        }
        sx={{ order: 0 }}
      />
      <SectionCard title="Total Clients" sx={{ order: 1 }}>
        <ClientVisitTrendChart data={visitStats} />
      </SectionCard>
      <SectionCard title="Adults vs Children" sx={{ order: 1 }}>
        <ClientVisitBreakdownChart data={visitStats} />
      </SectionCard>
      <SectionCard title="Quick Search" sx={{ order: 2 }}>
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
                  `/volunteer-management/volunteers?id=${res.id}&name=${encodeURIComponent(
                    res.name,
                  )}`,
                );
              }
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              
              variant={searchType === 'user' ? 'contained' : 'outlined'}
              sx={{ textTransform: 'none' }}
              onClick={() => setSearchType('user')}
            >
              Find Client
            </Button>
            <Button
              
              variant={searchType === 'volunteer' ? 'contained' : 'outlined'}
              sx={{ textTransform: 'none' }}
              onClick={() => setSearchType('volunteer')}
            >
              Find Volunteer
            </Button>
          </Stack>
        </Stack>
      </SectionCard>
      <SectionCard title="Recent Cancellations" sx={{ order: 3 }}>
        <List>
          {cancellations
            .filter(c => formatReginaDate(toDate(c.date)) === todayStr)
            .slice(0, 5)
            .map(c => (
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
      <SectionCard title="Volunteer Shift Changes" sx={{ order: 4 }}>
        <List>
          {todaysVolunteerCancellations.slice(0, 5).map(c => (
            <ListItem key={c.id}>
              <ListItemText
                primary={`${c.volunteer_name || 'Unknown'} - ${formatTime(
                  c.start_time || '',
                )}`}
              />
            </ListItem>
          ))}
        </List>
      </SectionCard>
    </Box>
    <Box sx={{ width: { xs: '100%', md: 360 }, flexShrink: 0 }}>
      <SectionCard
        title="News & Events"
        icon={<Announcement color="primary" />}
        sx={{ height: '100%' }}
      >
        <EventList events={[...events.today, ...events.upcoming]} limit={5} />
      </SectionCard>
    </Box>
  </Box>
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
    getBookings()
      .then(b => setBookings(Array.isArray(b) ? b : [b]))
      .catch(() => {});

    const todayStr = formatReginaDate(new Date());
    getSlotsRange(todayStr, 5)
      .then((days: SlotsByDate[]) => {
        const merged = days.flatMap(d =>
          d.slots
            .filter(s => (s.available ?? 0) > 0)
            .map(
              s =>
                `${formatLocaleDate(d.date, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: REGINA_TIMEZONE,
                })} ${formatTime(s.startTime)}-${formatTime(s.endTime)}`,
            ),
        );
        setSlotOptions(merged.slice(0, 3));
      })
      .catch(() => {});

    getEvents()
      .then(data =>
        setEvents(data ?? { today: [], upcoming: [], past: [] }),
      )
      .catch(() =>
        setEvents({ today: [], upcoming: [], past: [] }),
      );
  }, []);

  const appointments = bookings.filter(b => b.status === 'approved');
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title="My Upcoming Appointments" icon={<EventAvailable color="primary" />}>
          <List>
            {appointments.map(a => (
              <ListItem
                key={a.id}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" sx={{ textTransform: 'none' }}>
                      Cancel
                    </Button>
                    <Button variant="contained" sx={{ textTransform: 'none' }}>
                      Reschedule
                    </Button>
                  </Stack>
                }
              >
                <ListItemText
                  primary={`${formatLocaleDate(a.date, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: REGINA_TIMEZONE,
                  })} ${formatTime(a.start_time || '')}`}
                />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title="Notices" icon={<Announcement color="primary" />}>
          <EventList
            events={[...events.today, ...events.upcoming]}
            limit={5}
          />
        </SectionCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title="Next Available Slots" icon={<EventAvailable color="primary" />}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {slotOptions.map((s, i) => (
              <Button
                key={i}
                
                variant="contained"
                sx={{ textTransform: 'none', m: 0.5 }}
              >
                {s}
              </Button>
            ))}
          </Stack>
        </SectionCard>
      </Grid>
      <Grid size={12}>
        <SectionCard title="Quick Actions">
          <Stack direction="row" spacing={1}>
            <Button variant="contained" sx={{ textTransform: 'none' }}>
              Book
            </Button>
            <Button variant="outlined" sx={{ textTransform: 'none' }}>
              Reschedule
            </Button>
            <Button variant="outlined" sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
          </Stack>
        </SectionCard>
      </Grid>
    </Grid>
  );
}

export default function Dashboard({
  role,
  masterRoleFilter,
  showPantryQuickLinks = true,
}: DashboardProps) {
  useBreadcrumbActions(
    role === 'staff' && showPantryQuickLinks ? <PantryQuickLinks /> : null,
  );
  if (role === 'staff')
    return <StaffDashboard masterRoleFilter={masterRoleFilter} />;
  return <UserDashboard />;
}

