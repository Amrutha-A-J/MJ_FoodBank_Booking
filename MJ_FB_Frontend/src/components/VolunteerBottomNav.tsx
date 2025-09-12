import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';
import { useTranslation } from 'react-i18next';

export default function VolunteerBottomNav() {
  let role: Role | '' = '';
  let userRole = '';
  try {
    ({ role, userRole } = useAuth());
  } catch {}
  if (role !== 'volunteer') return null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
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
          label={t('dashboard')}
          value="dashboard"
          icon={<Dashboard aria-label={t('dashboard')} />}
        />
        <BottomNavigationAction
          label={t('volunteer_shift')}
          value="schedule"
          icon={<CalendarToday aria-label={t('volunteer_shift')} />}
        />
        {userRole === 'shopper' && [
          <BottomNavigationAction
            key="bookings"
            label={t('book_shopping')}
            value="bookings"
            icon={<CalendarToday aria-label={t('book_shopping')} />}
          />,
          <BottomNavigationAction
            key="profile"
            label={t('profile')}
            value="profile"
            icon={<AccountCircle aria-label={t('profile')} />}
          />,
        ]}
      </BottomNavigation>
    </Paper>
  );
}

