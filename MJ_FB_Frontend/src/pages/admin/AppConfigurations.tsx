import { useEffect, useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getAppConfig, updateAppConfig } from '../../api/appConfig';

export default function AppConfigurations() {
  const [form, setForm] = useState({
    cartTare: '',
    breadWeightMultiplier: '',
    cansWeightMultiplier: '',
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    getAppConfig()
      .then(cfg =>
        setForm({
          cartTare: String(cfg.cartTare),
          breadWeightMultiplier: String(cfg.breadWeightMultiplier),
          cansWeightMultiplier: String(cfg.cansWeightMultiplier),
        }),
      )
      .catch(() => {
        /* ignore */
      });
  }, []);

  function handleSave() {
    updateAppConfig({
      cartTare: Number(form.cartTare) || 0,
      breadWeightMultiplier: Number(form.breadWeightMultiplier) || 0,
      cansWeightMultiplier: Number(form.cansWeightMultiplier) || 0,
    })
      .then(() =>
        setSnackbar({ open: true, message: 'Configurations saved', severity: 'success' }),
      )
      .catch(err =>
        setSnackbar({
          open: true,
          message: err.message || 'Failed to save configurations',
          severity: 'error',
        }),
      );
  }

  return (
    <Page title="App Configurations">
      <Stack spacing={2} maxWidth={400}>
        <TextField
          label="Cart Tare (lbs)"
          type="number"
          value={form.cartTare}
          onChange={e => setForm({ ...form, cartTare: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Bread Weight Multiplier"
          type="number"
          value={form.breadWeightMultiplier}
          onChange={e =>
            setForm({ ...form, breadWeightMultiplier: e.target.value })
          }
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Cans Weight Multiplier"
          type="number"
          value={form.cansWeightMultiplier}
          onChange={e =>
            setForm({ ...form, cansWeightMultiplier: e.target.value })
          }
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" size="small" onClick={handleSave}>
          Save
        </Button>
      </Stack>
      <FeedbackSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Page>
  );
}
