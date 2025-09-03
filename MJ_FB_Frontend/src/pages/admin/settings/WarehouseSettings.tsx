import { useEffect, useState, type FormEvent } from 'react';
import { TextField, Button } from '@mui/material';
import FormCard from '../../../components/FormCard';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import {
  getWarehouseSettings,
  updateWarehouseSettings,
} from '../../../api/warehouseSettings';

export default function WarehouseSettings() {
  const [form, setForm] = useState({
    breadWeightMultiplier: '',
    cansWeightMultiplier: '',
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    getWarehouseSettings()
      .then(cfg =>
        setForm({
          breadWeightMultiplier: String(cfg.breadWeightMultiplier),
          cansWeightMultiplier: String(cfg.cansWeightMultiplier),
        }),
      )
      .catch(() => {
        /* ignore */
      });
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateWarehouseSettings({
      breadWeightMultiplier: Number(form.breadWeightMultiplier) || 0,
      cansWeightMultiplier: Number(form.cansWeightMultiplier) || 0,
    })
      .then(() =>
        setSnackbar({
          open: true,
          message: 'Settings saved',
          severity: 'success',
        }),
      )
      .catch(err =>
        setSnackbar({
          open: true,
          message: err.message || 'Failed to save settings',
          severity: 'error',
        }),
      );
  }

  return (
    <>
      <FormCard
        title="Warehouse Settings"
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
