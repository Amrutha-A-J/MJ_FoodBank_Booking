import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';
import { useLocation, useNavigate } from 'react-router-dom';

export default function VolunteerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const value = pathname.startsWith('/volunteer/schedule') ? 'schedule' : 'dashboard';

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, newValue) => {
          if (newValue === 'dashboard') navigate('/volunteer');
          if (newValue === 'schedule') navigate('/volunteer/schedule');
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

