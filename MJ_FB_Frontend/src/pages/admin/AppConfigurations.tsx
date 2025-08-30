import { useEffect, useState, type FormEvent } from 'react';
import { TextField, Button } from '@mui/material';
import FormCard from '../../components/FormCard';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getAppConfig, updateAppConfig } from '../../api/appConfig';

export default function AppConfigurations() {
  const [form, setForm] = useState({
    cartTare: '',
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    getAppConfig()
      .then(cfg => setForm({ cartTare: String(cfg.cartTare) }))
      .catch(() => {
        /* ignore */
      });
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateAppConfig({ cartTare: Number(form.cartTare) || 0 })
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
          label="Cart Tare (lbs)"
          type="number"
          value={form.cartTare}
          onChange={e => setForm({ ...form, cartTare: e.target.value })}
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
