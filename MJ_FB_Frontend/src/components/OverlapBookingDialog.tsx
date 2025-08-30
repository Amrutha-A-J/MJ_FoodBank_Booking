import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
} from '@mui/material';
import { formatTime } from '../utils/time';

interface BookingInfo {
  id?: number;
  role_id: number;
  role_name: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface Props {
  open: boolean;
  attempted: BookingInfo;
  existing: BookingInfo;
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
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Shift Conflict</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ mb: 2 }}>
          You already have a shift at this time. Which one would you like to keep?
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Existing Shift</Typography>
            <Typography>{existing.role_name}</Typography>
            <Typography>
              {existing.date} · {formatTime(existing.start_time)}–
              {formatTime(existing.end_time)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">New Shift</Typography>
            <Typography>{attempted.role_name}</Typography>
            <Typography>
              {attempted.date} · {formatTime(attempted.start_time)}–
              {formatTime(attempted.end_time)}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={() => onResolve('existing')}>
          Keep Existing Shift
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => onResolve('new')}
        >
          Replace with New Shift
        </Button>
      </DialogActions>
    </Dialog>
  );
}
