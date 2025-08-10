import { ReactNode } from 'react';
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
  CheckCircle,
  AccessTime,
} from '@mui/icons-material';

export type Role = 'staff' | 'volunteer' | 'user';

export interface DashboardProps {
  role: Role;
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

const mockStaff = {
  stats: {
    appointments: 24,
    volunteers: 8,
    approvals: 5,
    cancellations: 2,
  },
  approvals: [
    { name: 'Alice Johnson', type: 'User' },
    { name: 'Bob Lee', type: 'Volunteer' },
  ],
  coverage: [
    { role: 'Pantry', filled: 4, total: 5 },
    { role: 'Warehouse', filled: 2, total: 3 },
    { role: 'Driver', filled: 1, total: 2 },
  ],
  schedule: [
    { day: 'Mon', open: 12 },
    { day: 'Tue', open: 8 },
    { day: 'Wed', open: 10 },
    { day: 'Thu', open: 14 },
    { day: 'Fri', open: 6 },
    { day: 'Sat', open: 4 },
    { day: 'Sun', open: 0 },
  ],
  cancellations: ['Jones - 9:00 AM', 'Smith - 11:30 AM'],
  notices: ['Food drive Saturday', 'Team meeting Thursday'],
};

const mockVolunteer = {
  shifts: [
    { role: 'Pantry', time: 'Tue 9:00 AM', status: 'approved' },
    { role: 'Warehouse', time: 'Thu 1:00 PM', status: 'pending' },
  ],
  available: [
    { role: 'Pantry', time: 'Fri 9:00 AM' },
    { role: 'Garden', time: 'Sat 10:00 AM' },
  ],
  announcements: ['Training session next week', 'Wear closed-toe shoes'],
  trained: ['Pantry', 'Warehouse'],
};

const mockUser = {
  appointments: [
    { date: 'Jun 12', time: '10:00 AM' },
    { date: 'Jun 20', time: '2:00 PM' },
  ],
  pending: [{ date: 'Jun 30', time: '11:00 AM' }],
  slots: ['Jun 15 9:00 AM', 'Jun 16 11:00 AM', 'Jun 17 1:00 PM'],
  notices: ['Closed on July 4', 'Bring reusable bags'],
};

function StaffDashboard() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <SectionCard title="Today at a Glance">
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Stat
                icon={<CalendarToday color="primary" />}
                label="Appointments Today"
                value={mockStaff.stats.appointments}
              />
            </Grid>
            <Grid item xs={6}>
              <Stat
                icon={<People color="primary" />}
                label="Volunteers Scheduled"
                value={mockStaff.stats.volunteers}
              />
            </Grid>
            <Grid item xs={6}>
              <Stat
                icon={<WarningAmber color="warning" />}
                label="Pending Approvals"
                value={mockStaff.stats.approvals}
              />
            </Grid>
            <Grid item xs={6}>
              <Stat
                icon={<CancelIcon color="error" />}
                label="Cancellations"
                value={mockStaff.stats.cancellations}
              />
            </Grid>
          </Grid>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Pending Approvals">
          <List>
            {mockStaff.approvals.map((item, i) => (
              <ListItem
                key={i}
                secondaryAction={<Chip label={item.type} />}
              >
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Volunteer Coverage">
          <List>
            {mockStaff.coverage.map((item, i) => {
              const ratio = item.filled / item.total;
              let color: 'success' | 'warning' | 'error' | 'default' = 'default';
              if (ratio >= 1) color = 'success';
              else if (ratio >= 0.5) color = 'warning';
              else color = 'error';
              return (
                <ListItem
                  key={i}
                  secondaryAction={
                    <Chip color={color} label={`${item.filled}/${item.total}`} />
                  }
                >
                  <ListItemText primary={item.role} />
                </ListItem>
              );
            })}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Pantry Schedule (This Week)">
          <Grid container columns={7} spacing={2}>
            {mockStaff.schedule.map((day, i) => (
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
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
        <SectionCard title="Recent Cancellations">
          <List>
            {mockStaff.cancellations.map((c, i) => (
              <ListItem key={i}>
                <ListItemText primary={c} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12}>
        <SectionCard title="Notices & Events" icon={<Announcement color="primary" />}>
          <List>
            {mockStaff.notices.map((n, i) => (
              <ListItem key={i}>
                <ListItemText primary={n} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
    </Grid>
  );
}

function VolunteerDashboard() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <SectionCard title="My Next Shifts">
          <List>
            {mockVolunteer.shifts.map((s, i) => (
              <ListItem
                key={i}
                secondaryAction={
                  s.status === 'approved' ? (
                    <CheckCircle color="success" />
                  ) : (
                    <AccessTime color="warning" />
                  )
                }
              >
                <ListItemText primary={`${s.role} - ${s.time}`} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Available in My Roles">
          <List>
            {mockVolunteer.available.map((a, i) => (
              <ListItem
                key={i}
                secondaryAction={
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                  >
                    Request
                  </Button>
                }
              >
                <ListItemText primary={`${a.role} - ${a.time}`} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Announcements" icon={<Announcement color="primary" />}>
          <List>
            {mockVolunteer.announcements.map((a, i) => (
              <ListItem key={i}>
                <ListItemText primary={a} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Quick Actions">
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" sx={{ textTransform: 'none' }}>
              Request
            </Button>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
              Reschedule
            </Button>
          </Stack>
        </SectionCard>
      </Grid>
      <Grid item xs={12}>
        <SectionCard title="Profile & Training">
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              {mockVolunteer.trained.map((t, i) => (
                <Chip key={i} label={t} />
              ))}
            </Stack>
            <Button
              size="small"
              variant="outlined"
              sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
            >
              Update
            </Button>
          </Stack>
        </SectionCard>
      </Grid>
    </Grid>
  );
}

function UserDashboard() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <SectionCard title="My Upcoming Appointments" icon={<EventAvailable color="primary" />}>
          <List>
            {mockUser.appointments.map((a, i) => (
              <ListItem
                key={i}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ textTransform: 'none' }}
                    >
                      Reschedule
                    </Button>
                  </Stack>
                }
              >
                <ListItemText primary={`${a.date} ${a.time}`} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Pending Requests">
          <List>
            {mockUser.pending.map((p, i) => (
              <ListItem
                key={i}
                secondaryAction={<Chip label="Waiting for approval" color="warning" />}
              >
                <ListItemText primary={`${p.date} ${p.time}`} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Next Available Slots" icon={<EventAvailable color="primary" />}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {mockUser.slots.map((s, i) => (
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
            {mockUser.notices.map((n, i) => (
              <ListItem key={i}>
                <ListItemText primary={n} />
              </ListItem>
            ))}
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

export default function Dashboard({ role }: DashboardProps) {
  if (role === 'staff') return <StaffDashboard />;
  if (role === 'volunteer') return <VolunteerDashboard />;
  return <UserDashboard />;
}
