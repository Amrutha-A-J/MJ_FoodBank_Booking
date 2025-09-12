import { useEffect, useState } from 'react';
import {
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Chip,
  Tooltip,
  FormControl,
  FormControlLabel,
  Switch,
  FormHelperText,
  TextField,
  Button,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import PasswordField from '../../../components/PasswordField';

export interface EditClientFormData {
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
  initialData: EditClientFormData;
  onSave: (data: EditClientFormData) => Promise<boolean> | boolean;
  onSendReset?: (data: EditClientFormData) => void | Promise<void>;
}

export default function EditClientForm({
  open,
  initialData,
  onSave,
  onSendReset,
}: Props) {
  const [form, setForm] = useState<EditClientFormData>(initialData);

  useEffect(() => {
    if (open) {
      setForm(initialData);
    }
  }, [open, initialData]);

  function updateForm<K extends keyof EditClientFormData>(
    key: K,
    value: EditClientFormData[K],
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <>
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
                <FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.onlineAccess}
                        onChange={e =>
                          updateForm('onlineAccess', e.target.checked)
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
            {form.onlineAccess && !form.hasPassword && (
              <PasswordField
                fullWidth
                label="Password"
                value={form.password}
                onChange={e => updateForm('password', e.target.value)}
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
              onChange={e => updateForm('firstName', e.target.value)}
              inputProps={{ 'data-testid': 'first-name-input' }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={form.lastName}
              onChange={e => updateForm('lastName', e.target.value)}
              inputProps={{ 'data-testid': 'last-name-input' }}
            />
            <TextField
              fullWidth
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={e => updateForm('email', e.target.value)}
              inputProps={{ 'data-testid': 'email-input' }}
            />
            <TextField
              fullWidth
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={e => updateForm('phone', e.target.value)}
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
            onClick={() => onSendReset?.(form)}
            data-testid="send-reset-button"
          >
            Send password reset link
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={() => onSave(form)}
          disabled={!form.firstName || !form.lastName}
          data-testid="save-button"
        >
          Save
        </Button>
      </DialogActions>
    </>
  );
}

