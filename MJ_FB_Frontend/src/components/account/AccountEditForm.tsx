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
  const [showPasswordField, setShowPasswordField] = useState(
    initialData.onlineAccess && !initialData.hasPassword,
  );

  useEffect(() => {
    if (open) {
      setForm(initialData);
      setShowPasswordField(initialData.onlineAccess && !initialData.hasPassword);
    }
  }, [open, initialData]);

  function updateForm<K extends keyof AccountEditFormData>(
    key: K,
    value: AccountEditFormData[K],
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const title = `${form.firstName} ${form.lastName}`.trim();
  const shouldForcePasswordField = form.onlineAccess && !form.hasPassword;
  const isPasswordFieldVisible = shouldForcePasswordField || showPasswordField;

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
                          onChange={e => {
                            const checked = e.target.checked;
                            updateForm('onlineAccess', checked);
                            setShowPasswordField(prev => {
                              if (!checked) {
                                updateForm('password', '');
                                return false;
                              }
                              if (!form.hasPassword) {
                                return true;
                              }
                              return prev;
                            });
                          }}
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
                onClick={() =>
                  setShowPasswordField(prev => {
                    const next = !prev;
                    if (!next) {
                      updateForm('password', '');
                    }
                    return next;
                  })
                }
                data-testid="set-password-button"
                sx={{ alignSelf: { sm: 'flex-start' } }}
              >
                {showPasswordField ? 'Cancel' : 'Set password'}
              </Button>
            )}
            {isPasswordFieldVisible && (
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
