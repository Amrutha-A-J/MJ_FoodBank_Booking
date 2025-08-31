import { useEffect, useState, useCallback } from 'react';
import {
  getMyVolunteerBookings,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
} from '../../api/volunteers';
import type { VolunteerBooking } from '../../types';
import { formatTime } from '../../utils/time';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function VolunteerBookingHistory() {
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [cancelBooking, setCancelBooking] =
    useState<VolunteerBooking | null>(null);
  const [cancelSeriesId, setCancelSeriesId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const { t } = useTranslation();

  const loadHistory = useCallback(() => {
    getMyVolunteerBookings()
      .then(setHistory)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const groups = Array.from(
    history.reduce((map, b) => {
      const key = b.recurring_id ?? b.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
      return map;
    }, new Map<number, VolunteerBooking[]>() ).values()
  );

  async function handleCancel() {
    if (!cancelBooking) return;
    try {
      await cancelVolunteerBooking(cancelBooking.id);
      setSeverity('success');
      setMessage(t('booking_cancelled'));
      loadHistory();
    } catch {
      setSeverity('error');
      setMessage(t('booking_cancel_failed'));
    } finally {
      setCancelBooking(null);
    }
  }

  async function handleCancelSeries() {
    if (cancelSeriesId == null) return;
    try {
      await cancelRecurringVolunteerBooking(cancelSeriesId);
      setSeverity('success');
      setMessage(t('series_cancelled'));
      loadHistory();
    } catch {
      setSeverity('error');
      setMessage(t('series_cancel_failed'));
    } finally {
      setCancelSeriesId(null);
    }
  }

  return (
    <Page title={t('booking_history')}>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('role')}</TableCell>
              <TableCell>{t('date')}</TableCell>
              <TableCell>{t('time')}</TableCell>
              <TableCell>{t('status')}</TableCell>
              <TableCell>{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.flatMap(group =>
              group.map(h => (
                <TableRow key={h.id}>
                  <TableCell>{h.role_name}</TableCell>
                  <TableCell>{h.date}</TableCell>
                  <TableCell>
                    {formatTime(h.start_time)} - {formatTime(h.end_time)}
                  </TableCell>
                  <TableCell>{t(h.status.toLowerCase())}</TableCell>
                  <TableCell>
                    {h.status.toLowerCase() === 'approved' && (
                      <>
                        <Button
                          size="small"
                          onClick={() => setCancelBooking(h)}
                        >
                          {t('cancel')}
                        </Button>
                        {h.recurring_id && (
                          <Button
                            size="small"
                            onClick={() => setCancelSeriesId(h.recurring_id!)}
                          >
                            {t('cancel_all_upcoming')}
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )),
            )}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {t('no_bookings')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!cancelBooking} onClose={() => setCancelBooking(null)}>
        <DialogCloseButton onClose={() => setCancelBooking(null)} />
        <DialogTitle>{t('cancel_booking')}</DialogTitle>
        <DialogContent dividers>
          {t('cancel_booking_for_role_on_date', {
            role: cancelBooking?.role_name,
            date: cancelBooking?.date,
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} variant="outlined" color="primary">
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelSeriesId != null} onClose={() => setCancelSeriesId(null)}>
        <DialogCloseButton onClose={() => setCancelSeriesId(null)} />
        <DialogTitle>{t('cancel_series')}</DialogTitle>
        <DialogContent dividers>
          {t('cancel_all_upcoming_bookings_prompt')}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSeries} variant="outlined" color="primary">
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Page>
  );
}

