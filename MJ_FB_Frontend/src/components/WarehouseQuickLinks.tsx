import { Stack, Button } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export default function WarehouseQuickLinks() {
  const { pathname } = useLocation();
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  } as const;
  const links = [
    { to: '/warehouse-management/track-pigpound', label: 'Track Pig Pound' },
    { to: '/warehouse-management/donation-log', label: 'Track Donation' },
    { to: '/warehouse-management/track-outgoing-donations', label: 'Track Outgoing' },
    { to: '/warehouse-management/track-surplus', label: 'Track Surplus' },
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
          size="small"
          variant="outlined"
          sx={buttonSx}
          component={RouterLink}
          to={link.to}
          disabled={pathname === link.to}
          fullWidth
        >
          {link.label}
        </Button>
      ))}
    </Stack>
  );
}

