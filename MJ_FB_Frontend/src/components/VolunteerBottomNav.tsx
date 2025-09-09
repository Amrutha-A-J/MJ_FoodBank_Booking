import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Forum from '@mui/icons-material/Forum';

export default function VolunteerBottomNav() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/volunteer';
  const value = path.startsWith('/volunteer/schedule')
    ? 'schedule'
    : path.startsWith('/volunteer/messages')
    ? 'messages'
    : 'dashboard';

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, newValue) => {
          if (newValue === 'dashboard') window.location.assign('/volunteer');
          if (newValue === 'schedule') window.location.assign('/volunteer/schedule');
          if (newValue === 'messages') window.location.assign('/volunteer/messages');
        }}
      >
        <BottomNavigationAction label="Dashboard" value="dashboard" icon={<Dashboard />} />
        <BottomNavigationAction label="Schedule" value="schedule" icon={<CalendarToday />} />
        <BottomNavigationAction label="Messages" value="messages" icon={<Forum />} />
      </BottomNavigation>
    </Paper>
  );
}

