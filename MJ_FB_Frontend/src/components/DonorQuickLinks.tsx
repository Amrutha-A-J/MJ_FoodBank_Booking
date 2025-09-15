import { Stack, Button } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export default function DonorQuickLinks() {
  const { pathname } = useLocation();
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  } as const;
  const links = [
    { to: '/donor-management/donors', label: 'Donors' },
    { to: '/donor-management/donation-log', label: 'Donor Log' },
    { to: '/donor-management/mail-lists', label: 'Mail Lists' },
  ];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{ width: '100%', mb: 2 }}
    >
      {links.map(link => (
        <Button
          key={link.to}
          variant="outlined"
          sx={{ ...buttonSx, flex: 1 }}
          component={RouterLink}
          to={link.to}
          disabled={pathname === link.to}
        >
          {link.label}
        </Button>
      ))}
    </Stack>
  );
}

