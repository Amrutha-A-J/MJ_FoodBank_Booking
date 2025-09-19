import { useEffect, useState, type ReactNode } from 'react';
import {
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Tooltip,
  FormControl,
  FormControlLabel,
  Switch,
  FormHelperText,
  TextField,
  Button,
} from '@mui/material';
import type { ButtonProps } from '@mui/material/Button';
import PasswordField from '../PasswordField';

export interface AccountEditFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  onlineAccess: boolean;
  password: string;
  hasPassword: boolean;
}

interface AccountEditFormProps {
  open: boolean;
  initialData: AccountEditFormData;
  onSave: (data: AccountEditFormData) => Promise<boolean> | boolean;
  onSecondaryAction?: (data: AccountEditFormData) => void | Promise<void>;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onlineAccessLabel?: string;
  onlineAccessHelperText?: string;
  existingPasswordTooltip?: string;
  passwordLabel?: string;
  showOnlineAccessToggle?: boolean;
  titleAdornment?: (data: AccountEditFormData) => ReactNode;
  primaryActionTestId?: string;
  secondaryActionTestId?: string;
  passwordFieldTestId?: string;
  secondaryActionVariant?: ButtonProps['variant'];
}

export default function AccountEditForm({
  open,
  initialData,
  onSave,
  onSecondaryAction,
  primaryActionLabel = 'Save',
  secondaryActionLabel,
  onlineAccessLabel = 'Online Access',
  onlineAccessHelperText = 'Allow this user to sign in online.',
  existingPasswordTooltip = 'This user already has a password',
  passwordLabel = 'Password',
  showOnlineAccessToggle = true,
  titleAdornment,
  primaryActionTestId = 'save-button',
  secondaryActionTestId = 'secondary-action-button',
  passwordFieldTestId = 'password-input',
  secondaryActionVariant = 'outlined',
}: AccountEditFormProps) {
  const [form, setForm] = useState<AccountEditFormData>(initialData);

  useEffect(() => {
    if (open) {
      setForm(initialData);
    }
  }, [open, initialData]);

  function updateForm<K extends keyof AccountEditFormData>(
    key: K,
    value: AccountEditFormData[K],
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const title = `${form.firstName} ${form.lastName}`.trim();

  return (
    <>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {(title || titleAdornment) && (
            <Stack direction="row" spacing={1} alignItems="center">
              {title && <Typography variant="h6">{title}</Typography>}
              {titleAdornment?.(form)}
            </Stack>
          )}

          <Stack spacing={2}>
            <Typography variant="subtitle1">Account</Typography>
            {showOnlineAccessToggle && (
              <Tooltip
                title={existingPasswordTooltip}
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
                      label={onlineAccessLabel}
                    />
                    <FormHelperText>{onlineAccessHelperText}</FormHelperText>
                  </FormControl>
                </span>
              </Tooltip>
            )}
            {form.onlineAccess && !form.hasPassword && (
              <PasswordField
                fullWidth
                label={passwordLabel}
                value={form.password}
                onChange={e => updateForm('password', e.target.value)}
                inputProps={{ 'data-testid': passwordFieldTestId }}
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
        {form.onlineAccess && onSecondaryAction && secondaryActionLabel && (
          <Button
            variant={secondaryActionVariant}
            color="primary"
            onClick={() => onSecondaryAction(form)}
            data-testid={secondaryActionTestId}
          >
            {secondaryActionLabel}
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={() => onSave(form)}
          disabled={!form.firstName || !form.lastName}
          data-testid={primaryActionTestId}
        >
          {primaryActionLabel}
        </Button>
      </DialogActions>
    </>
  );
}
