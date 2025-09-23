import { useEffect, useState } from 'react';
import { DialogTitle } from '@mui/material';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from '../../components/DialogCloseButton';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import FormDialog from '../../components/FormDialog';
import { updateVolunteer, type VolunteerSearchResult } from '../../api/volunteers';
import { getApiErrorMessage } from '../../api/helpers';
import AccountEditForm, {
  type AccountEditFormData,
} from '../../components/account/AccountEditForm';

interface EditVolunteerDialogProps {
  volunteer: VolunteerSearchResult | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVolunteerDialog({ volunteer, onClose, onSaved }: EditVolunteerDialogProps) {
  const [form, setForm] = useState<AccountEditFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    onlineAccess: false,
    password: '',
    hasPassword: false,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  } | null>(null);

  useEffect(() => {
    if (volunteer) {
      setForm({
        firstName: volunteer.firstName,
        lastName: volunteer.lastName,
        email: volunteer.email || '',
        phone: volunteer.phone || '',
        onlineAccess: volunteer.hasPassword,
        password: '',
        hasPassword: volunteer.hasPassword,
      });
    }
  }, [volunteer]);

  async function handleSave(data: AccountEditFormData) {
    if (!volunteer) return false;
    try {
      await updateVolunteer(volunteer.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        onlineAccess: data.onlineAccess,
        ...(data.password ? { password: data.password } : {}),
      });
      setSnackbar({ open: true, message: 'Volunteer updated', severity: 'success' });
      onSaved();
      return true;
    } catch (err) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Unable to update volunteer'),
        severity: 'error',
      });
      return false;
    }
  }

  async function handleSendLink(data: AccountEditFormData) {
    if (!volunteer) return;
    try {
      await updateVolunteer(volunteer.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        onlineAccess: true,
        sendPasswordLink: true,
      });
      setSnackbar({ open: true, message: 'Password setup link sent', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Unable to send password setup link'),
        severity: 'error',
      });
    }
  }

  return (
    <FormDialog open={!!volunteer} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Edit Volunteer</DialogTitle>
      <AccountEditForm
        open={!!volunteer}
        initialData={form}
        onSave={handleSave}
        onSecondaryAction={handleSendLink}
        secondaryActionLabel="Send password setup link"
        onlineAccessHelperText="Allow the volunteer to sign in online."
        existingPasswordTooltip="Volunteer already has a password"
        primaryActionLabel="Save"
        secondaryActionTestId="send-password-setup-button"
      />
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </FormDialog>
  );
}
