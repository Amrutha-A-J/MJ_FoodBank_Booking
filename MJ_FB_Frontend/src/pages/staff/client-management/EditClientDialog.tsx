import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Switch,
  Stack,
  Tooltip,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PasswordField from '../../../components/PasswordField';
import DialogCloseButton from '../../../components/DialogCloseButton';
import {
  getUserByClientId,
  updateUserInfo,
  requestPasswordReset,
} from '../../../api/users';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';

interface Props {
  open: boolean;
  clientId: number;
  onClose: () => void;
  onUpdated: (message: string, severity: AlertColor) => void;
  onClientUpdated: (name: string) => void;
}

export default function EditClientDialog({
  open,
  clientId,
  onClose,
  onUpdated,
  onClientUpdated,
}: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    onlineAccess: false,
    password: '',
    hasPassword: false,
  });

  useEffect(() => {
    if (!open) return;
    getUserByClientId(String(clientId))
      .then(data => {
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          onlineAccess: Boolean(data.onlineAccess),
          password: '',
          hasPassword: data.hasPassword,
        });
      })
      .catch(err => {
        onUpdated(getApiErrorMessage(err, 'Failed to load client details'), 'error');
      });
  }, [open, clientId, onUpdated]);

  async function handleSaveClient(): Promise<boolean> {
    try {
      await updateUserInfo(clientId, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        onlineAccess: form.hasPassword ? true : form.onlineAccess,
        ...(form.onlineAccess && form.password
          ? { password: form.password }
          : {}),
      });
      onClientUpdated(`${form.firstName} ${form.lastName}`);
      onUpdated(t('client_updated'), 'success');
      onClose();
      return true;
    } catch (err: unknown) {
      onUpdated(getApiErrorMessage(err, 'Unable to update client'), 'error');
      return false;
    }
  }

  async function handleSendReset() {
    const ok = await handleSaveClient();
    if (!ok) return;
    try {
      await requestPasswordReset({ clientId: String(clientId) });
      onUpdated('Password reset link sent', 'success');
    } catch (err: unknown) {
      onUpdated(
        getApiErrorMessage(err, 'Failed to send password reset link'),
        'error',
      );
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Edit Client</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Tooltip
            title="Client already has a password"
            disableHoverListener={!form.hasPassword}
          >
            <span>
              <FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.onlineAccess}
                      onChange={e =>
                        setForm({ ...form, onlineAccess: e.target.checked })
                      }
                      disabled={form.hasPassword}
                      data-testid="online-access-toggle"
                    />
                  }
                  label="Online Access"
                />
                <FormHelperText>
                  Allow the client to sign in online.
                </FormHelperText>
              </FormControl>
            </span>
          </Tooltip>
          <TextField
            label="First Name"
            value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
          />
          <TextField
            label="Last Name"
            value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
          />
          <TextField
            label="Email (optional)"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            label="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
          {form.onlineAccess && !form.hasPassword && (
            <PasswordField
              label="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          )}
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
          onClick={handleSaveClient}
          disabled={!form.firstName || !form.lastName}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

