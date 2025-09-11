import { useEffect, useMemo, useState } from 'react';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';
import ManageVolunteerShiftDialog from '../../components/ManageVolunteerShiftDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  getVolunteerBookingHistory,
  cancelRecurringVolunteerBooking,
} from '../../api/volunteerBookings';
import type { VolunteerBookingDetail } from '../../types';
import { formatTime } from '../../utils/time';
import { useTranslation } from 'react-i18next';
import type { AlertColor } from '@mui/material';
import { Button, Typography } from '@mui/material';

interface Props {
  volunteerId: number;
  onUpdated?: (msg: string, severity: AlertColor) => void;
}

export default function BookingManagementBase({ volunteerId, onUpdated }: Props) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<VolunteerBookingDetail[]>([]);
  const [manageShift, setManageShift] = useState<VolunteerBookingDetail | null>(null);
  const [cancelRecurring, setCancelRecurring] =
    useState<VolunteerBookingDetail | null>(null);

  useEffect(() => {
    if (!volunteerId) return;
    (async () => {
      try {
        const data = await getVolunteerBookingHistory(volunteerId);
        setHistory(data);
      } catch {
        setHistory([]);
      }
    })();
  }, [volunteerId]);

  async function handleCancelRecurring(id: number) {
    try {
      await cancelRecurringVolunteerBooking(id);
      onUpdated?.(t('series_cancelled'), 'success');
      const data = await getVolunteerBookingHistory(volunteerId);
      setHistory(data);
    } catch {
      onUpdated?.(t('cancel_series_failed'), 'error');
    }
  }

  const columns: Column<VolunteerBookingDetail & { actions?: string }>[] = useMemo(
    () => [
      { field: 'role_name', header: t('role') },
      { field: 'date', header: t('date') },
      {
        field: 'time',
        header: t('time'),
        render: (row: VolunteerBookingDetail) => (
          <>
            {formatTime(row.start_time ?? '')} - {formatTime(row.end_time ?? '')}
          </>
        ),
      },
      {
        field: 'status',
        header: t('status'),
        render: row => t(row.status ?? ''),
      },
      {
        field: 'actions',
        header: '',
        render: row =>
          row.status === 'approved' ? (
            <>
              <Button
                onClick={() => setManageShift(row)}
                variant="outlined"
                color="primary"
                sx={{ mr: 1 }}
              >
                {t('manage')}
              </Button>
              {row.recurring_id && (
                <Button
                  onClick={() => setCancelRecurring(row)}
                  variant="outlined"
                  color="primary"
                >
                  {t('cancel_all_upcoming_short')}
                </Button>
              )}
            </>
          ) : null,
      },
    ],
    [t],
  );

  return (
    <>
      {history.length === 0 ? (
        <Typography align="center">{t('no_bookings')}</Typography>
      ) : (
        <ResponsiveTable
          rows={history}
          columns={columns}
          getRowKey={r => r.id}
        />
      )}
      <ManageVolunteerShiftDialog
        open={!!manageShift}
        booking={manageShift}
        onClose={() => setManageShift(null)}
        onUpdated={(msg, severity) => {
          onUpdated?.(msg, severity);
          setManageShift(null);
          (async () => {
            const data = await getVolunteerBookingHistory(volunteerId);
            setHistory(data);
          })();
        }}
      />
      {cancelRecurring && (
        <ConfirmDialog
          message={t('cancel_all_upcoming')}
          onConfirm={() => {
            if (cancelRecurring.recurring_id) {
              handleCancelRecurring(cancelRecurring.recurring_id);
            }
            setCancelRecurring(null);
          }}
          onCancel={() => setCancelRecurring(null)}
        />
      )}
    </>
  );
}
