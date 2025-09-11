import { useEffect, useState, type FormEvent } from 'react';
import { TextField, Button } from '@mui/material';
import FormCard from '../../../components/FormCard';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import { updateWarehouseSettings } from '../../../api/warehouseSettings';
import useWarehouseSettings from '../../../hooks/useWarehouseSettings';

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

  const { settings } = useWarehouseSettings();

  useEffect(() => {
    if (settings) {
      setForm({
        breadWeightMultiplier: String(settings.breadWeightMultiplier),
        cansWeightMultiplier: String(settings.cansWeightMultiplier),
      });
    }
  }, [settings]);

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
          <Button variant="contained" type="submit">
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
