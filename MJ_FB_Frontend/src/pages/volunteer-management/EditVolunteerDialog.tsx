import { useEffect, useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControlLabel,
  Switch,
  FormControl,
  FormHelperText,
  Tooltip,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from '../../components/DialogCloseButton';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import PasswordField from '../../components/PasswordField';
import FormDialog from '../../components/FormDialog';
import { updateVolunteer, type VolunteerSearchResult } from '../../api/volunteers';
import { getApiErrorMessage } from '../../api/helpers';

interface EditVolunteerDialogProps {
  volunteer: VolunteerSearchResult | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVolunteerDialog({ volunteer, onClose, onSaved }: EditVolunteerDialogProps) {
  const [form, setForm] = useState({
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

  async function handleSave() {
    if (!volunteer) return;
    try {
      await updateVolunteer(volunteer.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        onlineAccess: form.hasPassword ? true : form.onlineAccess,
        ...(form.onlineAccess && !form.hasPassword && form.password
          ? { password: form.password }
          : {}),
      });
      setSnackbar({ open: true, message: 'Volunteer updated', severity: 'success' });
      onSaved();
    } catch (err) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Unable to update volunteer'),
        severity: 'error',
      });
    }
  }

  async function handleSendLink() {
    if (!volunteer) return;
    try {
      await updateVolunteer(volunteer.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
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
      <DialogContent>
          <Stack spacing={2} mt={1}>
            <Tooltip title="Volunteer already has a password" disableHoverListener={!form.hasPassword}>
              <span>
                <FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.onlineAccess}
                        onChange={e =>
                          setForm({ ...form, onlineAccess: e.target.checked })
                        }
                        disabled={form.hasPassword}
                        data-testid="online-access-toggle"
                      />
                    }
                    label="Online Access"
                  />
                  <FormHelperText>
                    Allow the volunteer to sign in online.
                  </FormHelperText>
                </FormControl>
              </span>
            </Tooltip>
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              required
              fullWidth
          />
          <TextField
            label="Last Name"
            value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Email (optional)"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            fullWidth
          />
          <TextField
            label="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            fullWidth
          />
          {form.onlineAccess && !form.hasPassword && (
            <PasswordField
              label="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {form.onlineAccess && (
          <Button variant="outlined" onClick={handleSendLink}>
            Send password setup link
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={!form.firstName || !form.lastName}
          aria-label="Save volunteer"
        >
          Save
        </Button>
      </DialogActions>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </FormDialog>
  );
}
