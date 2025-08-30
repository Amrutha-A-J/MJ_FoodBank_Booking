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
import { getAllSlots, updateSlotCapacity } from '../../api/slots';
import {
  getAppConfig,
  updateAppConfig,
  type AppConfig,
} from '../../api/appConfig';

export default function PantrySettings() {
  const [capacity, setCapacity] = useState<number>(0);
  const [cartTare, setCartTare] = useState<number>(0);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: AlertColor } | null
  >(null);

  async function load() {
    try {
      const data = await getAllSlots();
      if (data.length > 0) setCapacity(data[0].maxCapacity ?? 0);
    } catch {
      setSnackbar({ message: 'Failed to load capacity', severity: 'error' });
    }
    try {
      const cfg = await getAppConfig();
      setCartTare(cfg.cartTare);
      setConfig(cfg);
    } catch {
      setSnackbar({ message: 'Failed to load cart tare', severity: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleSaveCapacity = async () => {
    try {
      await updateSlotCapacity(Number(capacity) || 0);
      setSnackbar({ message: 'Capacity updated', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to update capacity',
        severity: 'error',
      });
    }
  };

  const handleSaveCartTare = async () => {
    try {
      await updateAppConfig({
        cartTare: Number(cartTare) || 0,
        breadWeightMultiplier: config?.breadWeightMultiplier || 0,
        cansWeightMultiplier: config?.cansWeightMultiplier || 0,
      });
      setSnackbar({ message: 'Cart tare updated', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to update cart tare',
        severity: 'error',
      });
    }
  };

  return (
    <Page title="Pantry Settings">
      <Grid container spacing={2} p={2}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Pantry max booking capacity" />
            <CardContent>
              <TextField
                label="Max bookings per slot"
                type="number"
                size="small"
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
              />
              <Button
                size="small"
                sx={{ ml: 2 }}
                variant="contained"
                onClick={handleSaveCapacity}
              >
                Save
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Cart Tare (lbs)" />
            <CardContent>
              <TextField
                label="Cart Tare (lbs)"
                type="number"
                size="small"
                value={cartTare}
                onChange={e => setCartTare(Number(e.target.value) || 0)}
              />
              <Button
                size="small"
                sx={{ ml: 2 }}
                variant="contained"
                onClick={handleSaveCartTare}
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
