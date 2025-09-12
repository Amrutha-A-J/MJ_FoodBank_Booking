import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import {
  getDonorTestEmails,
  createDonorTestEmail,
  updateDonorTestEmail,
  deleteDonorTestEmail,
  type DonorTestEmail,
} from '../../../api/monetaryDonors';

export default function DonorSettingsTab() {
  const [emails, setEmails] = useState<DonorTestEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: AlertColor } | null
  >(null);

  async function load() {
    try {
      const data = await getDonorTestEmails();
      setEmails(data);
    } catch {
      setSnackbar({ message: 'Failed to load emails', severity: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    try {
      const added = await createDonorTestEmail(newEmail);
      setEmails(e => [...e, added]);
      setNewEmail('');
      setSnackbar({ message: 'Email added', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to add email',
        severity: 'error',
      });
    }
  }

  async function handleSave(id: number, email: string) {
    try {
      const updated = await updateDonorTestEmail(id, email);
      setEmails(e => e.map(em => (em.id === id ? updated : em)));
      setSnackbar({ message: 'Email updated', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to update email',
        severity: 'error',
      });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteDonorTestEmail(id);
      setEmails(e => e.filter(em => em.id !== id));
      setSnackbar({ message: 'Email deleted', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to delete email',
        severity: 'error',
      });
    }
  }

  return (
    <>
      <Grid container spacing={2} p={2}>
        <Grid size={12}>
          <Card>
            <CardHeader title="Test Emails" />
            <CardContent>
              <Stack spacing={2}>
                {emails.map(em => (
                  <Stack direction="row" spacing={1} alignItems="center" key={em.id}>
                    <TextField
                      value={em.email}
                      onChange={e =>
                        setEmails(list =>
                          list.map(it =>
                            it.id === em.id ? { ...it, email: e.target.value } : it,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleSave(em.id, em.email)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleDelete(em.id)}
                    >
                      Delete
                    </Button>
                  </Stack>
                ))}
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="New email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                  <Button variant="contained" onClick={handleAdd} disabled={!newEmail}>
                    Add
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </>
  );
}
