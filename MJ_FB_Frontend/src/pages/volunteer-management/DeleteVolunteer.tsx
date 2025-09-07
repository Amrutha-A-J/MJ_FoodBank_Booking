import { useState } from 'react';
import { Button } from '@mui/material';
import Page from '../../components/Page';
import EntitySearch from '../../components/EntitySearch';
import ConfirmDialog from '../../components/ConfirmDialog';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { deleteVolunteer } from '../../api/volunteers';

interface Volunteer { id: number; name: string; }

export default function DeleteVolunteer() {
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  async function handleDelete() {
    if (!volunteer) return;
    try {
      await deleteVolunteer(volunteer.id);
      setMessage('Volunteer deleted');
      setSeverity('success');
      setVolunteer(null);
    } catch {
      setMessage('Delete failed');
      setSeverity('error');
    }
    setConfirm(false);
  }

  return (
    <Page title="Delete Volunteer">
      <EntitySearch type="volunteer" placeholder="Search volunteer" onSelect={v => setVolunteer(v as Volunteer)} />
      {volunteer && (
        <Button
          size="small"
          variant="contained"
          color="error"
          sx={{ mt: 2 }}
          onClick={() => setConfirm(true)}
        >
          Delete
        </Button>
      )}
      {confirm && (
        <ConfirmDialog
          message={`Delete ${volunteer?.name}?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Page>
  );
}
