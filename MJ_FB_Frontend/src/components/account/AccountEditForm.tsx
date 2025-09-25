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
  draftKey?: string;
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
  draftKey,
}: AccountEditFormProps) {
  const [form, setForm] = useState<AccountEditFormData>(initialData);
  const [showPasswordOverride, setShowPasswordOverride] = useState(
    initialData.onlineAccess && !initialData.hasPassword,
  );
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const previousOpenRef = useRef(false);
  const isDirtyRef = useRef(false);
  const dirtyFieldsRef = useRef(new Set<keyof AccountEditFormData>());
  const formRef = useRef(form);

  type DraftPayload = {
    data: AccountEditFormData;
    dirtyKeys: Array<keyof AccountEditFormData>;
  };

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const loadDraft = (): DraftPayload | null => {
    if (!draftKey || typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<DraftPayload> | AccountEditFormData;
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        const payload = parsed as Partial<DraftPayload>;
        if (payload.data) {
          return {
            data: payload.data,
            dirtyKeys: payload.dirtyKeys ?? [],
          };
        }
      }
      return {
        data: parsed as AccountEditFormData,
        dirtyKeys: [],
      };
    } catch (err) {
      console.warn('Failed to read account edit draft', err);
      return null;
    }
  };

  const saveDraft = (data: AccountEditFormData) => {
    if (!draftKey || typeof window === 'undefined') return;
    try {
      const payload: DraftPayload = {
        data,
        dirtyKeys: Array.from(dirtyFieldsRef.current),
      };
      window.sessionStorage.setItem(draftKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to store account edit draft', err);
    }
  };

  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      if (draft) {
        const base: AccountEditFormData = {
          ...initialData,
          hasPassword: initialData.hasPassword,
        };

        const dirtyKeys = draft.dirtyKeys.length
          ? draft.dirtyKeys
          : (Object.keys(draft.data) as Array<keyof AccountEditFormData>).filter(
              key => draft.data[key] !== base[key],
            );

        const merged: AccountEditFormData = { ...base };
        dirtyKeys.forEach(key => {
          merged[key] = draft.data[key];
        });

        dirtyFieldsRef.current = new Set(dirtyKeys);
        isDirtyRef.current = dirtyFieldsRef.current.size > 0;
        setForm(merged);
        setShowPasswordOverride(
          merged.onlineAccess && (!merged.hasPassword || Boolean(merged.password)),
        );
        if (isDirtyRef.current && dirtyFieldsRef.current.size > 0) {
          saveDraft(merged);
        }
        return;
      }

      if (!isDirtyRef.current) {
        dirtyFieldsRef.current.clear();
        setForm(initialData);
        setShowPasswordOverride(initialData.onlineAccess && !initialData.hasPassword);
        return;
      }

      const merged: AccountEditFormData = {
        ...initialData,
        hasPassword: initialData.hasPassword,
      };

      dirtyFieldsRef.current.forEach(key => {
        merged[key] = formRef.current[key];
      });

      setForm(merged);
      setShowPasswordOverride(
        merged.onlineAccess && (!merged.hasPassword || Boolean(merged.password)),
      );
    }
  }, [open, initialData, draftKey]);

  useEffect(() => {
    let timeout: number | undefined;

    if (open && !previousOpenRef.current) {
      timeout = window.setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 0);
    }

    previousOpenRef.current = open;

    return () => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
    };
  }, [open]);

  function updateForm<K extends keyof AccountEditFormData>(
    key: K,
    value: AccountEditFormData[K],
  ) {
    isDirtyRef.current = true;
    dirtyFieldsRef.current.add(key);
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
      dirtyFieldsRef.current.delete('password');
      setForm(prev => ({ ...prev, password: '' }));
    }
  }, [form.onlineAccess, form.password]);

  useEffect(() => {
    if (!open || !draftKey) return;
    if (!isDirtyRef.current || dirtyFieldsRef.current.size === 0) return;
    saveDraft(formRef.current);
  }, [form, open, draftKey]);

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
