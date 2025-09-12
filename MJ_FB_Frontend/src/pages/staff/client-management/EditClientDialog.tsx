import { useEffect, useState } from 'react';
import type { AlertColor } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  getUserByClientId,
  updateUserInfo,
  requestPasswordReset,
} from '../../../api/users';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';
import EditClientForm, {
  type EditClientFormValues,
} from './EditClientForm';

interface Props {
  open: boolean;
  clientId: number;
  onClose: () => void;
  onUpdated: (message: string, severity: AlertColor) => void;
  onClientUpdated: (name: string) => void;
}

export async function handleSave(
  clientId: number,
  form: EditClientFormValues,
  onClientUpdated: (name: string) => void,
  onUpdated: (message: string, severity: AlertColor) => void,
  onClose: () => void,
  t: (key: string) => string,
): Promise<boolean> {
  try {
    await updateUserInfo(clientId, {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      onlineAccess: form.hasPassword ? true : form.onlineAccess,
      ...(form.onlineAccess && form.password ? { password: form.password } : {}),
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

export async function handleSendReset(
  clientId: number,
  form: EditClientFormValues,
  onClientUpdated: (name: string) => void,
  onUpdated: (message: string, severity: AlertColor) => void,
  onClose: () => void,
  t: (key: string) => string,
): Promise<void> {
  const ok = await handleSave(
    clientId,
    form,
    onClientUpdated,
    onUpdated,
    onClose,
    t,
  );
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
  const { t } = useTranslation();
  const [initialValues, setInitialValues] = useState<EditClientFormValues>({
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
        setInitialValues({
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

  return (
    <EditClientForm
      open={open}
      initialValues={initialValues}
      onClose={onClose}
      onSave={form =>
        handleSave(clientId, form, onClientUpdated, onUpdated, onClose, t)
      }
      onSendReset={form =>
        handleSendReset(clientId, form, onClientUpdated, onUpdated, onClose, t)
      }
    />
  );
}

