import { Stack, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function WarehouseQuickLinks() {
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  } as const;

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ width: '100%', flexWrap: 'nowrap', display: { xs: 'none', md: 'flex' } }}
    >
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/donation-log"
      >
        Track Donation
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/track-pigpound"
      >
        Track Pig Pounds
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/track-outgoing-donations"
      >
        Track Outgoing
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/track-surplus"
      >
        Track Surplus
      </Button>
    </Stack>
  );
}

