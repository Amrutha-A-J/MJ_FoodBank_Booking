import { useEffect, useState, type FormEvent } from 'react';
import { TextField, Button } from '@mui/material';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getAppConfig, updateAppConfig } from '../../api/appConfig';

export default function AppConfigurations() {
  const [form, setForm] = useState({
    breadWeightMultiplier: '',
    cansWeightMultiplier: '',
    cartTare: '',
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
          breadWeightMultiplier: String(cfg.breadWeightMultiplier),
          cansWeightMultiplier: String(cfg.cansWeightMultiplier),
          cartTare: String(cfg.cartTare),
        }),
      )
      .catch(() => {
        /* ignore */
      });
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    <>
      <FormCard
        title="App Configurations"
        onSubmit={handleSubmit}
        actions={
          <Button variant="contained" size="small" type="submit">
            Save
          </Button>
        }
      >
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
      </FormCard>
      <FeedbackSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </>
  );
}
