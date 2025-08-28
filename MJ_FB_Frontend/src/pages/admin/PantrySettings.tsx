import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getAllSlots, updateSlotCapacity } from '../../api/slots';
import type { Slot } from '../../types';
import { formatTime } from '../../utils/time';

export default function PantrySettings() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [maxCapacity, setMaxCapacity] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: AlertColor } | null
  >(null);

  async function load() {
    try {
      const data = await getAllSlots();
      setSlots(data);
      setMaxCapacity(data[0]?.maxCapacity ?? 0);
    } catch {
      setSnackbar({ message: 'Failed to load slots', severity: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      await updateSlotCapacity(Number(maxCapacity) || 0);
      setSnackbar({ message: 'Capacity updated', severity: 'success' });
      load();
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to update capacity',
        severity: 'error',
      });
    }
  };

  return (
    <Page title="Pantry Settings">
      <Grid container spacing={2} p={2}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Pantry Slots" />
            <CardContent>
              <Typography gutterBottom>
                {slots
                  .map(s => `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`)
                  .join(', ')}
              </Typography>
              <TextField
                label="Max slots per time"
                type="number"
                size="small"
                value={maxCapacity}
                onChange={e => setMaxCapacity(Number(e.target.value))}
              />
              <Button
                size="small"
                sx={{ ml: 2 }}
                variant="contained"
                onClick={handleSave}
              >
                Save
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </Page>
  );
}

