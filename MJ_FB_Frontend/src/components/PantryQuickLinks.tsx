import { Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function PantryQuickLinks() {
  const buttonSx = {
    textTransform: 'none',
    '&:hover': { color: 'primary.main' },
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{ width: '100%' }}
    >
      <Button
        
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/pantry/schedule"
        fullWidth
      >
        Pantry Schedule
      </Button>
      <Button
        
        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/pantry/visits"
        fullWidth
      >
        Record a Visit
      </Button>
      <Button

        variant="outlined"
        sx={buttonSx}
        component={RouterLink}
        to="/pantry/client-management"
        fullWidth
      >
        Search Client
      </Button>
    </Stack>
  );
}
