import { Stack, Button } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

export default function VolunteerQuickLinks() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  } as const;
  const links = [
    { to: '/volunteer-management/volunteers', label: 'Search Volunteer' },
    { to: '/volunteer-management/schedule', label: 'Volunteer Schedule' },
    { to: '/volunteer-management/daily', label: 'Daily Bookings' },
  ];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{ width: '100%' }}
    >
      {links.map(link => (
        <Button
          key={link.to}
          variant="outlined"
          sx={buttonSx}
          component={RouterLink}
          to={link.to}
          onClick={() => {
            if (pathname === link.to) navigate(0);
          }}
          fullWidth
        >
          {link.label}
        </Button>
      ))}
    </Stack>
  );
}
