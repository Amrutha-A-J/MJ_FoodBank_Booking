import { useCallback, useEffect, useState } from 'react';
import { Grid, Card, CardHeader, CardContent, TextField, Button } from '@mui/material';
import type { AlertColor } from '@mui/material';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import { getAllSlots, updateSlotCapacity } from '../../../api/slots';
import { updateAppConfig } from '../../../api/appConfig';
import useAppConfig from '../../../hooks/useAppConfig';

export default function PantrySettingsTab() {
  const [capacity, setCapacity] = useState<number>(0);
  const [cartTare, setCartTare] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: AlertColor } | null
  >(null);
  const { appConfig, error: appConfigError } = useAppConfig();

  const loadCapacity = useCallback(async () => {
    try {
      const data = await getAllSlots();
      if (data.length > 0) setCapacity(data[0].maxCapacity ?? 0);
    } catch {
      setSnackbar({ message: 'Failed to load capacity', severity: 'error' });
    }
  }, []);

  useEffect(() => {
    loadCapacity();
  }, [loadCapacity]);

  useEffect(() => {
    setCartTare(appConfig.cartTare);
  }, [appConfig.cartTare]);

  useEffect(() => {
    if (appConfigError) {
      setSnackbar({ message: 'Failed to load cart tare', severity: 'error' });
    }
  }, [appConfigError]);

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
    <>
      <Grid container spacing={2}>
        <Grid size={12}>
          <Card>
            <CardHeader title="Pantry max booking capacity" />
            <CardContent>
              <TextField
                label="Max bookings per slot"
                type="number"
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
              />
              <Button
                size="medium"
                sx={{ ml: 2 }}
                variant="contained"
                onClick={handleSaveCapacity}
              >
                Save
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card>
            <CardHeader title="Cart Tare (lbs)" />
            <CardContent>
              <TextField
                label="Cart Tare (lbs)"
                type="number"
                value={cartTare}
                onChange={e => setCartTare(Number(e.target.value) || 0)}
              />
              <Button
                size="medium"
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
    </>
  );
}

