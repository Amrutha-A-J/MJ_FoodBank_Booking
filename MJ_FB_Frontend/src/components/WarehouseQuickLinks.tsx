import { Stack, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function WarehouseQuickLinks() {
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  } as const;

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={{ xs: 1, md: 2 }}
      sx={{ width: '100%', flexWrap: 'wrap' }}
    >
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management"
        fullWidth
      >
        Dashboard
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/donation-log"
        fullWidth
      >
        Donation Log
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/track-surplus"
        fullWidth
      >
        Track Surplus
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/track-pigpound"
        fullWidth
      >
        Track Pigpound
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/track-outgoing-donations"
        fullWidth
      >
        Track Outgoing Donations
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/aggregations"
        fullWidth
      >
        Aggregations
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/warehouse-management/exports"
        fullWidth
      >
        Exports
      </Button>
    </Stack>
  );
}

