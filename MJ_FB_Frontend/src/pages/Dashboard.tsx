import { useEffect, useState, type ReactNode } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  TextField,
  Chip,
  IconButton,
} from '@mui/material';
import {
  CalendarToday,
  People,
  WarningAmber,
  Cancel as CancelIcon,
  Search,
  EventAvailable,
  Announcement,
} from '@mui/icons-material';
import {
  getBookings,
  getSlots,
  getVolunteerRoles,
  getVolunteerBookingsByRole,
} from '../api/api';
import type { Role, Slot } from '../types';
import { formatTime } from '../utils/time';

export interface DashboardProps {
  role: Role;
  token: string;
}

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

const SectionCard = ({ title, icon, children }: SectionCardProps) => (
  <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: 1 }}>
    <CardHeader title={title} avatar={icon} />
    <CardContent>{children}</CardContent>
  </Card>
);

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

interface Booking {
  id: number;
  status: string;
  date: string;
  user_name?: string;
  start_time?: string;
  end_time?: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatLocalDate(date: Date) {
  return date.toLocaleDateString('en-CA');
}

function StaffDashboard({ token }: { token: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [coverage, setCoverage] = useState<
    { role: string; filled: number; total: number }[]
  >([]);
  const [schedule, setSchedule] = useState<{ day: string; open: number }[]>([]);

  useEffect(() => {
    getBookings(token).then(setBookings).catch(() => {});

    const todayStr = formatLocalDate(new Date());
    getVolunteerRoles(token)
      .then(roles =>
        Promise.all(
          roles.map(async r => {
            const bookings = await getVolunteerBookingsByRole(token, r.id);
            const filled = bookings.filter(
              (b: any) =>
                b.status === 'approved' &&
                formatLocalDate(new Date(b.date)) === todayStr,
            ).length;
            return { role: r.name, filled, total: r.max_volunteers };
          }),
        ),
      )
      .then(data => setCoverage(data))
      .catch(() => {});

    const today = new Date();
    Promise.all(
      [...Array(7)].map(async (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = formatLocalDate(d);
        const slots = await getSlots(token, dateStr);
        const open = (slots as Slot[]).reduce(
          (sum, s) => sum + (s.available || 0),
          0,
        );
        return {
          day: d.toLocaleDateString(undefined, { weekday: 'short' }),
          open,
        };
      }),
    )
      .then(setSchedule)
      .catch(() => {});
  }, [token]);

  const todayStr = formatLocalDate(new Date());
  const pending = bookings.filter(b => b.status === 'submitted');
  const cancellations = bookings.filter(b => b.status === 'cancelled');
  const stats = {
    appointments: bookings.filter(
      b =>
        b.status === 'approved' &&
        formatLocalDate(new Date(b.date)) === todayStr,
    ).length,
    volunteers: coverage.reduce((sum, c) => sum + c.filled, 0),
    approvals: pending.length,
    cancellations: cancellations.filter(
      b => formatLocalDate(new Date(b.date)) === todayStr,
    ).length,
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <SectionCard title="Today at a Glance">
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Stat
                icon={<CalendarToday color="primary" />}
                label="Appointments Today"
                value={stats.appointments}
              />
            </Grid>
            <Grid item xs={6}>
              <Stat
                icon={<People color="primary" />}
                label="Volunteers Scheduled"
                value={stats.volunteers}
              />
            </Grid>
            <Grid item xs={6}>
              <Stat
                icon={<WarningAmber color="warning" />}
                label="Pending Approvals"
                value={stats.approvals}
              />
            </Grid>
            <Grid item xs={6}>
              <Stat
                icon={<CancelIcon color="error" />}
                label="Cancellations"
                value={stats.cancellations}
              />
            </Grid>
          </Grid>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Pending Approvals">
          <List>
            {pending.map(b => (
              <ListItem key={b.id} secondaryAction={<Chip label="User" />}>
                <ListItemText primary={b.user_name || 'Unknown'} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Volunteer Coverage">
          <List>
            {coverage.map((c, i) => {
              const ratio = c.filled / c.total;
              let color: 'success' | 'warning' | 'error' | 'default' = 'default';
              if (ratio >= 1) color = 'success';
              else if (ratio >= 0.5) color = 'warning';
              else color = 'error';
              return (
                <ListItem
                  key={i}
                  secondaryAction={<Chip color={color} label={`${c.filled}/${c.total}`} />}
                >
                  <ListItemText primary={c.role} />
                </ListItem>
              );
            })}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <SectionCard title="Pantry Schedule (This Week)">
              <Grid container columns={7} spacing={2}>
                {schedule.map((day, i) => (
                  <Grid item xs={1} key={i}>
                    <Stack alignItems="center" spacing={1}>
                      <Typography variant="body2">{day.day}</Typography>
                      <Chip
                        label={`Open: ${day.open}`}
                        color={day.open > 0 ? 'success' : 'default'}
                      />
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Grid>
          <Grid item xs={12}>
            <SectionCard title="Quick Search">
              <Stack spacing={2}>
                <Stack direction="row" spacing={1}>
                  <TextField size="small" placeholder="Search" fullWidth />
                  <IconButton color="primary" size="small">
                    <Search />
                  </IconButton>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" sx={{ textTransform: 'none' }}>
                    Find Client
                  </Button>
                  <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
                    Find Volunteer
                  </Button>
                </Stack>
              </Stack>
            </SectionCard>
          </Grid>
          <Grid item xs={12}>
            <SectionCard title="Recent Cancellations">
              <List>
                {cancellations.slice(0, 5).map(c => (
                  <ListItem key={c.id}>
                    <ListItemText
                      primary={`${c.user_name || 'Unknown'} - ${formatTime(c.start_time || '')}`}
                    />
                  </ListItem>
                ))}
              </List>
            </SectionCard>
          </Grid>
          <Grid item xs={12}>
            <SectionCard title="Notices & Events" icon={<Announcement color="primary" />}>
              <List>
                <ListItem>
                  <ListItemText primary="" />
                </ListItem>
              </List>
            </SectionCard>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

function UserDashboard({ token }: { token: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slotOptions, setSlotOptions] = useState<string[]>([]);

  useEffect(() => {
    getBookings(token).then(setBookings).catch(() => {});

    const today = new Date();
    Promise.all(
      [...Array(5)].map(async (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = formatLocalDate(d);
        const slots = await getSlots(token, dateStr);
        return (slots as Slot[])
          .filter(s => s.available > 0)
          .map(s => `${formatDate(dateStr)} ${formatTime(s.startTime)}-${formatTime(s.endTime)}`);
      }),
    )
      .then(days => {
        const merged = days.flat();
        setSlotOptions(merged.slice(0, 3));
      })
      .catch(() => {});
  }, [token]);

  const appointments = bookings.filter(b => b.status === 'approved');
  const pending = bookings.filter(b => b.status === 'submitted');

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <SectionCard title="My Upcoming Appointments" icon={<EventAvailable color="primary" />}>
          <List>
            {appointments.map(a => (
              <ListItem
                key={a.id}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
                      Cancel
                    </Button>
                    <Button size="small" variant="contained" sx={{ textTransform: 'none' }}>
                      Reschedule
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
      <Grid item xs={12} md={6}>
        <SectionCard title="Pending Requests">
          <List>
            {pending.map(p => (
              <ListItem
                key={p.id}
                secondaryAction={<Chip label="Waiting for approval" color="warning" />}
              >
                <ListItemText
                  primary={`${formatDate(p.date)} ${formatTime(p.start_time || '')}`}
                />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Next Available Slots" icon={<EventAvailable color="primary" />}>
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
      <Grid item xs={12} md={6}>
        <SectionCard title="Notices" icon={<Announcement color="primary" />}>
          <List>
            <ListItem>
              <ListItemText primary="" />
            </ListItem>
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12}>
        <SectionCard title="Quick Actions">
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" sx={{ textTransform: 'none' }}>
              Book
            </Button>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
              Reschedule
            </Button>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
          </Stack>
        </SectionCard>
      </Grid>
    </Grid>
  );
}

export default function Dashboard({ role, token }: DashboardProps) {
  if (role === 'staff') return <StaffDashboard token={token} />;
  return <UserDashboard token={token} />;
}

