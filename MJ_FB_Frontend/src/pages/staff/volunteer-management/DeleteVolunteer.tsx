import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import EntitySearch from '../../../components/EntitySearch';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import { deleteVolunteer, type VolunteerSearchResult } from '../../../api/volunteers';
import { getApiErrorMessage } from '../../../api/helpers';

export default function DeleteVolunteer() {
  const [volunteer, setVolunteer] =
    useState<VolunteerSearchResult | null>(null);
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
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Unable to delete volunteer'));
      setSeverity('error');
    }
    setConfirm(false);
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Delete Volunteer
      </Typography>
      <EntitySearch
        type="volunteer"
        placeholder="Search volunteer"
        onSelect={v => setVolunteer(v as VolunteerSearchResult)}
      />
      {volunteer && (
        <Button
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
    </Box>
  );
}
