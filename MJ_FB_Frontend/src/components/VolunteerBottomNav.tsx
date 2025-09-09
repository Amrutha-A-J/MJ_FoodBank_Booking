import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';

export default function VolunteerBottomNav() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/volunteer';
  const value = path.startsWith('/volunteer/schedule') ? 'schedule' : 'dashboard';

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, newValue) => {
          if (newValue === 'dashboard') window.location.assign('/volunteer');
          if (newValue === 'schedule') window.location.assign('/volunteer/schedule');
        }}
      >
        <BottomNavigationAction
          label="Dashboard"
          value="dashboard"
          icon={<Dashboard aria-label="dashboard" />}
        />
        <BottomNavigationAction
          label="Schedule"
          value="schedule"
          icon={<CalendarToday aria-label="schedule" />}
        />
      </BottomNavigation>
    </Paper>
  );
}

