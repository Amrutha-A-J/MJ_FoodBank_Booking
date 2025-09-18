import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
} from '@mui/material';
import { formatTime } from '../utils/time';
import { formatReginaDate } from '../utils/date';
import type { VolunteerBookingInfo } from '../types';
import FormDialog from './FormDialog';

interface Props {
  open: boolean;
  attempted: VolunteerBookingInfo;
  existing: VolunteerBookingInfo;
  onClose: () => void;
  onResolve: (choice: 'existing' | 'new') => void;
}

export default function OverlapBookingDialog({
  open,
  attempted,
  existing,
  onClose,
  onResolve,
}: Props) {
  return (
    <FormDialog open={open} onClose={onClose}>
      <DialogTitle>Shift Conflict</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ mb: 2 }}>
          You already have a shift at this time. Which one would you like to keep?
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2">Existing Shift</Typography>
            <Typography>{existing.role_name}</Typography>
            <Typography>
              {formatReginaDate(existing.date)} · {formatTime(existing.start_time)}–
              {formatTime(existing.end_time)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2">New Shift</Typography>
            <Typography>{attempted.role_name}</Typography>
            <Typography>
              {formatReginaDate(attempted.date)} · {formatTime(attempted.start_time)}–
              {formatTime(attempted.end_time)}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onResolve('existing')}>
          Keep Existing Shift
        </Button>
        <Button
          
          variant="contained"
          onClick={() => onResolve('new')}
        >
          Replace with New Shift
        </Button>
      </DialogActions>
    </FormDialog>
  );
}
