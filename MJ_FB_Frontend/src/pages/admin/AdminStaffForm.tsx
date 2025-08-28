import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import StaffForm from '../../components/StaffForm';
import { getStaff, createStaff, updateStaff } from '../../api/adminStaff';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import type { Staff } from '../../types';

export default function AdminStaffForm() {
  const { id } = useParams();
  const [initial, setInitial] = useState<Staff | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      getStaff(Number(id))
        .then(data => setInitial(data))
        .catch(err => setError(err.message || String(err)));
    }
  }, [id]);

  return (
    <Box p={2}>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <Button variant="outlined" component={RouterLink} to="/admin/staff" sx={{ mb: 2 }}>
        Back to Staff List
      </Button>
      <StaffForm
        initial={initial}
        submitLabel={id ? 'Save' : 'Add Staff'}
        onSubmit={async data => {
          if (id) {
            await updateStaff(
              Number(id),
              data.firstName,
              data.lastName,
              data.email,
              data.access,
              data.password,
            );
          } else {
            await createStaff(
              data.firstName,
              data.lastName,
              data.email,
              data.password || '',
              data.access,
            );
          }
        }}
      />
    </Box>
  );
}
