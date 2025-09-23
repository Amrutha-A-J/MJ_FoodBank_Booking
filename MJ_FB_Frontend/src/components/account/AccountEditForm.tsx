import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const [showPasswordOverride, setShowPasswordOverride] = useState(
    initialData.onlineAccess && !initialData.hasPassword,
  );
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialData);
      setShowPasswordOverride(initialData.onlineAccess && !initialData.hasPassword);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      firstNameInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open, initialData]);

  function updateForm<K extends keyof AccountEditFormData>(
    key: K,
    value: AccountEditFormData[K],
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const title = `${form.firstName} ${form.lastName}`.trim();
  const shouldShowPasswordField =
    form.onlineAccess && (showPasswordOverride || !form.hasPassword);

  useEffect(() => {
    if (!form.onlineAccess && showPasswordOverride) {
      setShowPasswordOverride(false);
    }
  }, [form.onlineAccess, showPasswordOverride]);

  useEffect(() => {
    if (!form.onlineAccess && form.password) {
      setForm(prev => ({ ...prev, password: '' }));
    }
  }, [form.onlineAccess, form.password]);

  function togglePasswordField() {
    if (!showPasswordOverride && !form.onlineAccess) {
      updateForm('onlineAccess', true);
    }
    if (showPasswordOverride) {
      updateForm('password', '');
    }
    setShowPasswordOverride(prev => !prev);
  }

  function FormSection({ title, children }: { title: string; children: ReactNode }) {
    return (
      <Stack spacing={2} component="section">
        <Typography variant="subtitle1">{title}</Typography>
        {children}
      </Stack>
    );
  }

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

          <FormSection title="Account">
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
            {form.onlineAccess && form.hasPassword && (
              <Button
                variant="outlined"
                onClick={togglePasswordField}
                data-testid="set-password-button"
              >
                {showPasswordOverride ? 'Cancel password change' : 'Set password'}
              </Button>
            )}
            {shouldShowPasswordField && (
              <PasswordField
                fullWidth
                label={passwordLabel}
                value={form.password}
                onChange={e => updateForm('password', e.target.value)}
                inputProps={{ 'data-testid': passwordFieldTestId }}
              />
            )}
          </FormSection>

          <FormSection title="Contact">
            <TextField
              fullWidth
              label="First Name"
              value={form.firstName}
              onChange={e => updateForm('firstName', e.target.value)}
              inputRef={firstNameInputRef}
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
          </FormSection>
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
