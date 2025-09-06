import { Stack, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function PantryQuickLinks() {
  return (
    <Stack direction="row" spacing={2} mb={2}>
      <Button
        size="small"
        variant="contained"
        sx={{ textTransform: 'none' }}
        component={RouterLink}
        to="/pantry/schedule"
      >
        Pantry Schedule
      </Button>
      <Button
        size="small"
        variant="contained"
        sx={{ textTransform: 'none' }}
        component={RouterLink}
        to="/pantry/visits"
      >
        Record a Visit
      </Button>
      <Button
        size="small"
        variant="contained"
        sx={{ textTransform: 'none' }}
        component={RouterLink}
        to="/pantry/client-management?tab=history"
      >
        Search Client
      </Button>
    </Stack>
  );
}
