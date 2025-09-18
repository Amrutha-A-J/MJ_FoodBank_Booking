import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  type AlertColor,
} from '@mui/material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import {
  getDonor,
  getDonorDonations,
  updateDonor,
  type DonorDetail,
  type DonorDonation,
} from '../../api/donors';
import { formatLocaleDate } from '../../utils/date';
import Page from '../../components/Page';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { getApiErrorMessage } from '../../api/helpers';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DonorProfile() {
  const { id } = useParams<{ id: string }>();
  const [donor, setDonor] = useState<DonorDetail | null>(null);
  const [donations, setDonations] = useState<DonorDonation[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'success' });
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const donorId = id ? Number(id) : NaN;

  const loadDonor = useCallback(async () => {
    if (!id || Number.isNaN(donorId)) return;
    try {
      const detail = await getDonor(donorId);
      setDonor(detail);
    } catch (err) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Failed to load donor'),
        severity: 'error',
      });
    }
  }, [donorId, id]);

  useEffect(() => {
    void loadDonor();
  }, [loadDonor]);

  useEffect(() => {
    if (!id || Number.isNaN(donorId)) return;
    getDonorDonations(donorId)
      .then(setDonations)
      .catch(err => {
        setDonations([]);
        setSnackbar({
          open: true,
          message: getApiErrorMessage(err, 'Failed to load donations'),
          severity: 'error',
        });
      });
  }, [donorId, id]);

  useEffect(() => {
    if (donor) {
      setForm({
        firstName: donor.firstName,
        lastName: donor.lastName,
        email: donor.email ?? '',
        phone: donor.phone ?? '',
      });
    }
  }, [donor]);

  const handleOpenEdit = () => {
    setFormErrors({});
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setFormErrors({});
    if (donor) {
      setForm({
        firstName: donor.firstName,
        lastName: donor.lastName,
        email: donor.email ?? '',
        phone: donor.phone ?? '',
      });
    }
  };

  const handleSave = async () => {
    if (!donor) return;
    const trimmed = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    const errors: typeof formErrors = {};
    if (!trimmed.firstName) errors.firstName = 'First name is required';
    if (!trimmed.lastName) errors.lastName = 'Last name is required';
    if (trimmed.email && !EMAIL_REGEX.test(trimmed.email)) {
      errors.email = 'Enter a valid email';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await updateDonor(donor.id, {
        firstName: trimmed.firstName,
        lastName: trimmed.lastName,
        email: trimmed.email || undefined,
        phone: trimmed.phone || undefined,
      });
      setSnackbar({ open: true, message: 'Donor updated', severity: 'success' });
      setEditOpen(false);
      await loadDonor();
    } catch (err) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Unable to update donor'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const emailDisplay = donor?.email?.trim() ? donor.email : 'Email not provided';
  const phoneDisplay = donor?.phone?.trim() ? donor.phone : 'Phone not provided';

  const closeSnackbar = () =>
    setSnackbar(prev => ({ ...prev, open: false }));

  const columns: Column<DonorDonation>[] = [
    {
      field: 'date',
      header: 'Date',
      render: d => formatLocaleDate(d.date),
    },
    { field: 'weight', header: 'Weight (lbs)' },
  ];

  return (
    <Page title="Donor Profile">
      <Box>
        {donor && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6">
                    {donor.firstName} {donor.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: {emailDisplay}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phone: {phoneDisplay}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total: {donor.totalLbs.toLocaleString()} lbs
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last Donation: {donor.lastDonationISO
                      ? formatLocaleDate(donor.lastDonationISO)
                      : 'N/A'}
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={handleOpenEdit} sx={{ mt: 1 }}>
                  Edit
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Donations
            </Typography>
            {donations.length ? (
              <ResponsiveTable columns={columns} rows={donations} getRowKey={d => d.id} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No donations found.
              </Typography>
            )}
          </CardContent>
        </Card>
        <FeedbackSnackbar
          open={snackbar.open}
          onClose={closeSnackbar}
          message={snackbar.message}
          severity={snackbar.severity}
        />
      </Box>
      <Dialog open={editOpen} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogCloseButton onClose={handleCloseEdit} />
        <DialogTitle>Edit Donor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              error={Boolean(formErrors.firstName)}
              helperText={formErrors.firstName}
              required
              fullWidth
            />
            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              error={Boolean(formErrors.lastName)}
              helperText={formErrors.lastName}
              required
              fullWidth
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
              fullWidth
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} aria-label="Save donor">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
