import { useEffect, useState, useCallback } from 'react';
import {
  getMyVolunteerBookings,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
} from '../../api/volunteers';
import type { VolunteerBooking } from '../../types';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import RescheduleDialog from '../../components/RescheduleDialog';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import BookingHistoryTable from '../../components/BookingHistoryTable';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import { getVolunteerRolesForVolunteer } from '../../api/volunteers';
import { formatTime } from '../../utils/time';

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

  async function handleReschedule(date: string, roleId: string) {
    if (!rescheduleBooking) return;
    try {
      await rescheduleVolunteerBookingByToken(
        rescheduleBooking.reschedule_token || '',
        Number(roleId),
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

  async function loadRoleOptions(date: string) {
    try {
      const roles = await getVolunteerRolesForVolunteer(date);
      return roles
        .filter(r => r.available > 0)
        .map(r => ({
          id: r.id.toString(),
          label: `${r.name} ${formatTime(r.start_time)}–${formatTime(
            r.end_time,
          )}`,
        }));
    } catch {
      return [];
    }
  }

  return (
    <Page title={t('volunteer_booking_history')}>
      {rows.length === 0 ? (
        <Typography align="center">{t('no_bookings')}</Typography>
      ) : (
        <BookingHistoryTable
          rows={rows}
          showRole
          onCancel={b => setCancelBooking(b)}
          onReschedule={b => setRescheduleBooking(b)}
          onCancelSeries={id => setCancelSeriesId(id)}
          getRowKey={h => h.id}
        />
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

      <RescheduleDialog
        open={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        loadOptions={loadRoleOptions}
        onSubmit={handleReschedule}
        optionLabel="Role"
        submitLabel="Submit"
      />

      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
      <VolunteerBottomNav />
    </Page>
  );
}

