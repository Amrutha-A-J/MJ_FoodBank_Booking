import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getAllSlots, updateAllSlotsCapacity } from '../../api/slots';

export default function PantrySettings() {
  const [capacity, setCapacity] = useState<number | ''>('');
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: AlertColor } | null
  >(null);

  async function load() {
    try {
      const data = await getAllSlots();
      setCapacity(data[0]?.maxCapacity ?? '');
    } catch {
      setSnackbar({ message: 'Failed to load slots', severity: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      await updateAllSlotsCapacity(Number(capacity) || 0);
      setSnackbar({ message: 'Pantry capacity updated', severity: 'success' });
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Pantry Booking Capacity" />
            <CardContent>
              <TextField
                label="Max Capacity"
                type="number"
                size="small"
                value={capacity}
                onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
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

