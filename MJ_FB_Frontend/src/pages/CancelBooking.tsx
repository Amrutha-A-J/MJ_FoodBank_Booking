import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Typography, Button, Grid } from '@mui/material';
import Page from '../components/Page';
import FormCard from '../components/FormCard';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { cancelBookingByToken } from '../api/bookings';
import { useTranslation } from 'react-i18next';

export default function CancelBooking() {
  const { token } = useParams();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function run() {
      if (!token) {
        setError(t('invalid_or_expired_token'));
        return;
      }
      try {
        await cancelBookingByToken(token);
        setMessage(t('booking_cancelled'));
      } catch (err) {
        setError(t('cancel_booking_failed'));
      }
    }
    run();
  }, [token, t]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <Page title={t('cancel_booking')}>
      <Grid container spacing={2} justifyContent="center">
        <Grid xs={12} sm={8} md={6}>
          <FormCard title={t('cancel_booking')} onSubmit={handleSubmit} actions={
            <Button component={RouterLink} to="/" variant="contained">
              {t('back_to_login')}
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
    </Page>
  );
}
