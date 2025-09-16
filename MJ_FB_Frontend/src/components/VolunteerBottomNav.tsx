import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

export default function VolunteerBottomNav() {
  let role: Role | '' = '';
  let userRole = '';
  try {
    ({ role, userRole } = useAuth());
  } catch {}
  if (role !== 'volunteer') return null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  let value: 'dashboard' | 'schedule' | 'bookings' | 'profile' = 'dashboard';
  if (pathname.startsWith('/volunteer/schedule')) value = 'schedule';
  else if (pathname.startsWith('/book-appointment') || pathname.startsWith('/booking-history'))
    value = 'bookings';
  else if (pathname.startsWith('/profile')) value = 'profile';

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        pb: 'env(safe-area-inset-bottom)',
        borderTop: 1,
        borderColor: 'divider',
      }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={value}
        sx={{ height: 72 }}
        onChange={(_, newValue) => {
          if (newValue === 'dashboard') navigate('/volunteer');
          if (newValue === 'schedule') navigate('/volunteer/schedule');
          if (newValue === 'bookings') navigate('/book-appointment');
          if (newValue === 'profile') navigate('/profile');
        }}
      >
        <BottomNavigationAction label="Dashboard" value="dashboard" icon={<Dashboard />} aria-label="dashboard" />
        <BottomNavigationAction label="Shifts" value="schedule" icon={<CalendarToday />} aria-label="shifts" />
        {userRole === 'shopper' && [
          <BottomNavigationAction
            key="bookings"
            label="Book Shopping"
            value="bookings"
            icon={<CalendarToday />}
            aria-label="book shopping"
          />,
          <BottomNavigationAction
            key="profile"
            label="Profile"
            value="profile"
            icon={<AccountCircle />}
            aria-label="profile"
          />,
        ]}
      </BottomNavigation>
    </Paper>
  );
}

