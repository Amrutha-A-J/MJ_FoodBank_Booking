import { Stack, Button } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export default function DonorQuickLinks() {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  } as const;
  const links = [
    { to: '/donor-management', label: 'Dashboard', match: (path: string) => path === '/donor-management' },
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
      {links.map(link => {
        const isActive = link.match
          ? link.match(normalizedPath)
          : normalizedPath === link.to || normalizedPath.startsWith(`${link.to}/`);
        return (
        <Button
          key={link.to}
          variant="outlined"
          sx={{ ...buttonSx, flex: 1 }}
          component={RouterLink}
          to={link.to}
          disabled={isActive}
        >
          {link.label}
        </Button>
        );
      })}
    </Stack>
  );
}

