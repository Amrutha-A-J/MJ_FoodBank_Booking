import { Stack, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function PantryQuickLinks() {
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  };

  return (
    <Stack direction="row" spacing={2}>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/pantry/schedule"
      >
        Pantry Schedule
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/pantry/visits"
      >
        Record a Visit
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/pantry/client-management?tab=history"
      >
        Search Client
      </Button>
    </Stack>
  );
}
