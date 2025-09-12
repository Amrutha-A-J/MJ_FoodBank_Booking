import { useEffect, useState } from 'react';
import { Dialog, DialogTitle } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { useTranslation } from 'react-i18next';
import DialogCloseButton from '../../../components/DialogCloseButton';
import { getUserByClientId, updateUserInfo, requestPasswordReset } from '../../../api/users';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';
import EditClientForm, {
  type EditClientFormData,
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
  data: EditClientFormData,
  onClientUpdated: (name: string) => void,
  onUpdated: (message: string, severity: AlertColor) => void,
  t: (key: string) => string,
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
  data: EditClientFormData,
  onClientUpdated: (name: string) => void,
  onUpdated: (message: string, severity: AlertColor) => void,
  t: (key: string) => string,
  onClose: () => void,
) {
  const ok = await handleSave(clientId, data, onClientUpdated, onUpdated, t, onClose);
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
  const [form, setForm] = useState<EditClientFormData>({
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

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Edit Client</DialogTitle>
      <EditClientForm
        open={open}
        initialData={form}
        onSave={data => handleSave(clientId, data, onClientUpdated, onUpdated, t, onClose)}
        onSendReset={data => handleSendReset(clientId, data, onClientUpdated, onUpdated, t, onClose)}
      />
    </Dialog>
  );
}

