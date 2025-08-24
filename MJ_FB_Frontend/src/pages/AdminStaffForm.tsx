import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import StaffForm from '../components/StaffDashboard/StaffForm';
import { getStaff, createStaff, updateStaff } from '../api/adminStaff';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import type { Staff } from '../types';

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
    <>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
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
    </>
  );
}
