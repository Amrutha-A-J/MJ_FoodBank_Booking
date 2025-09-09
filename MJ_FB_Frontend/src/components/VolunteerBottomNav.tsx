import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function VolunteerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  let userRole = '';
  try {
    ({ userRole } = useAuth());
  } catch {}
  let value: 'dashboard' | 'schedule' | 'bookings' | 'profile' = 'dashboard';
  if (pathname.startsWith('/volunteer/schedule')) value = 'schedule';
  else if (pathname.startsWith('/book-appointment') || pathname.startsWith('/booking-history'))
    value = 'bookings';
  else if (pathname.startsWith('/profile')) value = 'profile';

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, newValue) => {
          if (newValue === 'dashboard') navigate('/volunteer');
          if (newValue === 'schedule') navigate('/volunteer/schedule');
          if (newValue === 'bookings') navigate('/book-appointment');
          if (newValue === 'profile') navigate('/profile');
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
        {userRole === 'shopper' && [
          <BottomNavigationAction
            key="bookings"
            label="Bookings"
            value="bookings"
            icon={<CalendarToday aria-label="bookings" />}
          />,
          <BottomNavigationAction
            key="profile"
            label="Profile"
            value="profile"
            icon={<AccountCircle aria-label="profile" />}
          />,
        ]}
      </BottomNavigation>
    </Paper>
  );
}

