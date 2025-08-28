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
import { getAllSlots, updateSlot } from '../../api/slots';
import type { Slot } from '../../types';
import { formatTime } from '../../utils/time';

export default function PantrySettings() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: AlertColor } | null
  >(null);

  async function load() {
    try {
      const data = await getAllSlots();
      setSlots(data);
    } catch {
      setSnackbar({ message: 'Failed to load slots', severity: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleChange = (id: string, value: string) => {
    setSlots(prev =>
      prev.map(s => (s.id === id ? { ...s, maxCapacity: Number(value) } : s)),
    );
  };

  const handleSave = async (slot: Slot) => {
    try {
      await updateSlot(slot.id, {
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxCapacity: Number(slot.maxCapacity) || 0,
      });
      setSnackbar({ message: 'Slot updated', severity: 'success' });
      load();
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to update slot',
        severity: 'error',
      });
    }
  };

  return (
    <Page title="Pantry Settings">
      <Grid container spacing={2} p={2}>
        {slots.map(slot => (
          <Grid item xs={12} md={6} key={slot.id}>
            <Card>
              <CardHeader title={`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`} />
              <CardContent>
                <TextField
                  label="Max Capacity"
                  type="number"
                  size="small"
                  value={slot.maxCapacity ?? ''}
                  onChange={e => handleChange(slot.id, e.target.value)}
                />
                <Button
                  size="small"
                  sx={{ ml: 2 }}
                  variant="contained"
                  onClick={() => handleSave(slot)}
                >
                  Save
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {slots.length === 0 && (
          <Grid item xs={12}>
            <Typography>No slots found.</Typography>
          </Grid>
        )}
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
