import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useTheme } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

export default function ClientBottomNav() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  let role: Role | '' = '';
  try {
    ({ role } = useAuth());
  } catch {}
  if (role === 'staff') return null;
  const isDelivery = role === 'delivery';
  let value: 'dashboard' | 'bookings' | 'delivery' | 'profile' = 'dashboard';
  if (pathname.startsWith('/profile')) value = 'profile';
  else if (isDelivery) {
    if (pathname.startsWith('/delivery')) value = 'delivery';
  } else if (
    pathname.startsWith('/book-appointment') ||
    pathname.startsWith('/booking-history')
  )
    value = 'bookings';

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar + 1,
        pb: 'env(safe-area-inset-bottom)',
      }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={value}
        sx={{ height: 72 }}
        onChange={(_, newValue) => {
          if (newValue === 'dashboard') navigate('/');
          if (newValue === 'bookings') navigate('/book-appointment');
          if (newValue === 'delivery') navigate('/delivery/book');
          if (newValue === 'profile') navigate('/profile');
        }}
      >
        <BottomNavigationAction label="Dashboard" value="dashboard" icon={<Dashboard />} aria-label="dashboard" />
        <BottomNavigationAction
          label={isDelivery ? 'Delivery' : 'Bookings'}
          value={isDelivery ? 'delivery' : 'bookings'}
          icon={<CalendarToday />}
          aria-label={isDelivery ? 'delivery' : 'bookings'}
        />
        <BottomNavigationAction label="Profile" value="profile" icon={<AccountCircle />} aria-label="profile" />
      </BottomNavigation>
    </Paper>
  );
}
