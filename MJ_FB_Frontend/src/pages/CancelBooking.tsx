import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Typography, Button, Grid } from '@mui/material';
import Page from '../components/Page';
import FormCard from '../components/FormCard';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import ClientBottomNav from '../components/ClientBottomNav';
import VolunteerBottomNav from '../components/VolunteerBottomNav';
import { cancelBookingByToken } from '../api/bookings';
import { useAuth } from '../hooks/useAuth';

export default function CancelBooking() {
  const { token } = useParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { role } = useAuth();

  useEffect(() => {
    async function run() {
      if (!token) {
        setError('Invalid or expired token');
        return;
      }
      try {
        await cancelBookingByToken(token);
        setMessage('Booking cancelled');
      } catch (err) {
        setError('Failed to cancel booking');
      }
    }
    run();
  }, [token]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <Page
      title="Cancel booking"
      sx={{ pb: { xs: 'calc(72px + env(safe-area-inset-bottom))' } }}
    >
      <Grid container spacing={2} justifyContent="center">
        <Grid size={{ xs: 12, sm: 8, md: 6 }}>
          <FormCard title="Cancel booking" onSubmit={handleSubmit} actions={
            <Button component={RouterLink} to="/" variant="contained">
              Back to Login
            </Button>
          }>
            <Typography>{message || error || ''}</Typography>
          </FormCard>
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!error || !!message}
        onClose={() => {
          setError('');
          setMessage('');
        }}
        message={error || message}
        severity={error ? 'error' : 'success'}
      />
      {role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </Page>
  );
}
