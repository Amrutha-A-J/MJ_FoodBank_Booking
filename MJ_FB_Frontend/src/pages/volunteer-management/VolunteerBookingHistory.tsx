import { useEffect, useState, useCallback } from 'react';
import {
  getMyVolunteerBookings,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
} from '../../api/volunteers';
import type { VolunteerBooking } from '../../types';
import { formatTime } from '../../utils/time';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import VolunteerRescheduleDialog from '../../components/VolunteerRescheduleDialog';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { AlertColor } from '@mui/material';

export default function VolunteerBookingHistory() {
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [cancelBooking, setCancelBooking] =
    useState<VolunteerBooking | null>(null);
  const [cancelSeriesId, setCancelSeriesId] = useState<number | null>(null);
  const [rescheduleBooking, setRescheduleBooking] =
    useState<VolunteerBooking | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const { t } = useTranslation();

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const loadHistory = useCallback(() => {
    getMyVolunteerBookings()
      .then(setHistory)
      .catch(() => {
        setSeverity('error');
        setMessage('Failed to load booking history');
      });
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
  const rows = groups.flatMap(group => group);

  async function handleCancel() {
    if (!cancelBooking) return;
    try {
      await cancelVolunteerBooking(cancelBooking.id);
      setSeverity('success');
      setMessage(t('booking_cancelled'));
      loadHistory();
    } catch {
      setSeverity('error');
      setMessage(t('cancel_booking_failed'));
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
      setMessage(t('cancel_series_failed'));
    } finally {
      setCancelSeriesId(null);
    }
  }

  async function handleReschedule(date: string, roleId: number) {
    if (!rescheduleBooking) return;
    try {
      await rescheduleVolunteerBookingByToken(
        rescheduleBooking.reschedule_token || '',
        roleId,
        date,
      );
      setSeverity('success');
      setMessage('Booking rescheduled');
      loadHistory();
    } catch {
      setSeverity('error');
      setMessage('Failed to reschedule booking');
    } finally {
      setRescheduleBooking(null);
    }
  }

  const columns: Column<VolunteerBooking>[] = [
    { field: 'role_name', header: t('role') },
    { field: 'date', header: t('date') },
    {
      field: 'time' as keyof VolunteerBooking & string,
      header: t('time'),
      render: h => `${formatTime(h.start_time ?? '')} - ${formatTime(h.end_time ?? '')}`,
    },
    { field: 'status', header: t('status'), render: h => t(h.status ?? '') },
    {
      field: 'actions' as keyof VolunteerBooking & string,
      header: t('actions'),
      render: h =>
        h.status?.toLowerCase() === 'approved'
          ? isSmall ? (
              <Stack direction="column" spacing={1} sx={{ width: '100%' }}>
                <Button onClick={() => setCancelBooking(h)} fullWidth>
                  {t('cancel')}
                </Button>
                <Button onClick={() => setRescheduleBooking(h)} fullWidth>
                  {t('reschedule')}
                </Button>
                {h.recurring_id && (
                  <Button
                    
                    onClick={() => setCancelSeriesId(h.recurring_id!)}
                    fullWidth
                  >
                    {t('cancel_all_upcoming_short')}
                  </Button>
                )}
              </Stack>
            ) : (
              <>
                <Button onClick={() => setCancelBooking(h)}>
                  {t('cancel')}
                </Button>
                <Button onClick={() => setRescheduleBooking(h)}>
                  {t('reschedule')}
                </Button>
                {h.recurring_id && (
                  <Button
                    
                    onClick={() => setCancelSeriesId(h.recurring_id!)}
                  >
                    {t('cancel_all_upcoming_short')}
                  </Button>
                )}
              </>
            )
          : null,
    },
  ];

  return (
    <Page title={t('booking_history')}>
      {rows.length === 0 ? (
        <Typography align="center">{t('no_bookings')}</Typography>
      ) : (
        <ResponsiveTable columns={columns} rows={rows} getRowKey={h => h.id} />
      )}

      <Dialog open={!!cancelBooking} onClose={() => setCancelBooking(null)}>
        <DialogCloseButton onClose={() => setCancelBooking(null)} />
        <DialogTitle>{t('cancel_booking')}</DialogTitle>
        <DialogContent dividers>
          {t('cancel_booking_for', { role: cancelBooking?.role_name, date: cancelBooking?.date })}
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
          {t('cancel_all_upcoming')}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSeries} variant="outlined" color="primary">
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <VolunteerRescheduleDialog
        open={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onSubmit={handleReschedule}
      />

      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Page>
  );
}

