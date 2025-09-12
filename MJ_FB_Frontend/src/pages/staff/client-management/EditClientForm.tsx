import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import PasswordField from '../../../components/PasswordField';
import DialogCloseButton from '../../../components/DialogCloseButton';

export interface EditClientFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  onlineAccess: boolean;
  password: string;
  hasPassword: boolean;
}

interface Props {
  open: boolean;
  initialValues: EditClientFormValues;
  onClose: () => void;
  onSave: (values: EditClientFormValues) => Promise<boolean> | boolean;
  onSendReset?: (values: EditClientFormValues) => Promise<void> | void;
}

export default function EditClientForm({
  open,
  initialValues,
  onClose,
  onSave,
  onSendReset,
}: Props) {
  const [form, setForm] = useState<EditClientFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [open, initialValues]);

  async function handleSave() {
    await onSave(form);
  }

  async function handleSendReset() {
    if (onSendReset) {
      await onSendReset(form);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Edit Client</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">
              {form.firstName} {form.lastName}
            </Typography>
            {form.hasPassword && (
              <Chip
                color="success"
                icon={<CheckCircleOutline />}
                label="Online account"
                data-testid="online-badge"
              />
            )}
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle1">Account</Typography>
            <Tooltip
              title="Client already has a password"
              disableHoverListener={!form.hasPassword}
            >
              <span>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.onlineAccess}
                      onChange={e =>
                        setForm({ ...form, onlineAccess: e.target.checked })
                      }
                      disabled={form.hasPassword}
                    />
                  }
                  label="Online Access"
                />
              </span>
            </Tooltip>
            {form.onlineAccess && !form.hasPassword && (
              <PasswordField
                fullWidth
                label="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            )}
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle1">Contact</Typography>
            <TextField
              fullWidth
              label="First Name"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Last Name"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {form.onlineAccess && (
          <Button variant="outlined" color="primary" onClick={handleSendReset}>
            Send password reset link
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!form.firstName || !form.lastName}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

