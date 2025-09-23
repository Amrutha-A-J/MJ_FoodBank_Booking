import { useEffect, useRef, useState } from 'react';
import { Chip, DialogTitle } from '@mui/material';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from '../../../components/DialogCloseButton';
import FormDialog from '../../../components/FormDialog';
import { getUserByClientId, updateUserInfo, requestPasswordReset } from '../../../api/users';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';
import AccountEditForm, {
  type AccountEditFormData,
} from '../../../components/account/AccountEditForm';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';

interface Props {
  open: boolean;
  clientId: number;
  onClose: () => void;
  onUpdated: (message: string, severity: AlertColor) => void;
  onClientUpdated: (name: string) => void;
}

export async function handleSave(
  clientId: number,
  data: AccountEditFormData,
  onClientUpdated: (name: string) => void,
  onUpdated: (message: string, severity: AlertColor) => void,
  onClose: () => void,
): Promise<boolean> {
  try {
    await updateUserInfo(clientId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      onlineAccess: data.hasPassword ? true : data.onlineAccess,
      ...(data.onlineAccess && data.password ? { password: data.password } : {}),
    });
    onClientUpdated(`${data.firstName} ${data.lastName}`);
    onUpdated('Client updated', 'success');
    onClose();
    return true;
  } catch (err: unknown) {
    onUpdated(getApiErrorMessage(err, 'Unable to update client'), 'error');
    return false;
  }
}

export async function handleSendReset(
  clientId: number,
  data: AccountEditFormData,
  onClientUpdated: (name: string) => void,
  onUpdated: (message: string, severity: AlertColor) => void,
  onClose: () => void,
) {
  const ok = await handleSave(clientId, data, onClientUpdated, onUpdated, onClose);
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

export default function EditClientDialog({
  open,
  clientId,
  onClose,
  onUpdated,
  onClientUpdated,
}: Props) {
  const latestOnUpdated = useRef(onUpdated);
  const [form, setForm] = useState<AccountEditFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    onlineAccess: false,
    password: '',
    hasPassword: false,
  });

  useEffect(() => {
    latestOnUpdated.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getUserByClientId(String(clientId))
      .then(data => {
        if (!active) return;
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
        if (!active) return;
        latestOnUpdated.current(
          getApiErrorMessage(err, 'Failed to load client details'),
          'error',
        );
      });
    return () => {
      active = false;
    };
  }, [open, clientId]);

  return (
    <FormDialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Edit Client</DialogTitle>
      <AccountEditForm
        open={open}
        initialData={form}
        onSave={data => handleSave(clientId, data, onClientUpdated, onUpdated, onClose)}
        onSecondaryAction={data =>
          handleSendReset(clientId, data, onClientUpdated, onUpdated, onClose)
        }
        secondaryActionLabel="Send password reset link"
        onlineAccessHelperText="Allow the client to sign in online."
        existingPasswordTooltip="Client already has a password"
        secondaryActionTestId="send-reset-button"
        titleAdornment={data =>
          data.hasPassword ? (
            <Chip
              color="success"
              icon={<CheckCircleOutline />}
              label="Online account"
              data-testid="online-badge"
            />
          ) : null
        }
      />
    </FormDialog>
  );
}

