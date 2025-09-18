import { useEffect, useState } from 'react';
import {
  DialogTitle,
  FormControlLabel,
  Switch,
  Stack,
  FormHelperText,
  FormControl,
  Tooltip,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from '../../../components/DialogCloseButton';
import FormDialog from '../../../components/FormDialog';
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
  data: EditClientFormData,
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
    <FormDialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Edit Client</DialogTitle>
      <Stack spacing={2} sx={{ px: 3, pt: 1 }}>
        <Tooltip
          title="Client already has a password"
          disableHoverListener={!form.hasPassword}
        >
          <span>
            <FormControl>
              <FormControlLabel
                control={
                  <Switch
                    name="online access"
                    checked={form.onlineAccess}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        onlineAccess: e.target.checked,
                      }))
                    }
                    disabled={form.hasPassword}
                  />
                }
                label="Online Access"
              />
              <FormHelperText>Allow the client to sign in online.</FormHelperText>
            </FormControl>
          </span>
        </Tooltip>
      </Stack>
      <EditClientForm
        open={open}
        initialData={form}
        onSave={data => handleSave(clientId, data, onClientUpdated, onUpdated, onClose)}
        onSendReset={data => handleSendReset(clientId, data, onClientUpdated, onUpdated, onClose)}
        showOnlineAccessToggle={false}
      />
    </FormDialog>
  );
}

