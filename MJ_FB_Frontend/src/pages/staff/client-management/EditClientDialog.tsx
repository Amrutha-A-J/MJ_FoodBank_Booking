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
                inputProps={{ 'data-testid': 'password-input' }}
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
              inputProps={{ 'data-testid': 'first-name-input' }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              inputProps={{ 'data-testid': 'last-name-input' }}
            />
            <TextField
              fullWidth
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              inputProps={{ 'data-testid': 'email-input' }}
            />
            <TextField
              fullWidth
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              inputProps={{ 'data-testid': 'phone-input' }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {form.onlineAccess && (
          <Button
            variant="outlined"
            color="primary"
            onClick={handleSendReset}
            data-testid="send-reset-button"
          >
            Send password reset link
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveClient}
          disabled={!form.firstName || !form.lastName}
          data-testid="save-button"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

