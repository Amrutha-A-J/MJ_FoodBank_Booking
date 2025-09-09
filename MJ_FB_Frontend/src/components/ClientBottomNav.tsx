import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccountCircle from '@mui/icons-material/AccountCircle';

export default function ClientBottomNav() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  let value: 'dashboard' | 'bookings' | 'profile' = 'dashboard';
  if (path.startsWith('/book-appointment') || path.startsWith('/booking-history')) value = 'bookings';
  else if (path.startsWith('/profile')) value = 'profile';

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, newValue) => {
          if (newValue === 'dashboard') window.location.assign('/');
          if (newValue === 'bookings') window.location.assign('/book-appointment');
          if (newValue === 'profile') window.location.assign('/profile');
        }}
      >
        <BottomNavigationAction label="Dashboard" value="dashboard" icon={<Dashboard />} aria-label="dashboard" />
        <BottomNavigationAction label="Bookings" value="bookings" icon={<CalendarToday />} aria-label="bookings" />
        <BottomNavigationAction label="Profile" value="profile" icon={<AccountCircle />} aria-label="profile" />
      </BottomNavigation>
    </Paper>
  );
}
