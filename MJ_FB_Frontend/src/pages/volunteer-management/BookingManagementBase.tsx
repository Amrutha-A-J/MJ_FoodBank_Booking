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
import type { AlertColor } from '@mui/material';
import { Button, Typography } from '@mui/material';

const statusLabels: Record<string, string> = {
  approved: 'Approved',
  cancelled: 'Cancelled',
  no_show: 'No show',
  completed: 'Completed',
};

interface Props {
  volunteerId: number;
  onUpdated?: (msg: string, severity: AlertColor) => void;
}

export default function BookingManagementBase({ volunteerId, onUpdated }: Props) {
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
      onUpdated?.('Series cancelled', 'success');
      const data = await getVolunteerBookingHistory(volunteerId);
      setHistory(data);
    } catch {
      onUpdated?.('Failed to cancel series', 'error');
    }
  }

  const columns: Column<VolunteerBookingDetail & { actions?: string }>[] = useMemo(
    () => [
      { field: 'role_name', header: 'Role' },
      { field: 'date', header: 'Date' },
      {
        field: 'start_time',
        header: 'Time',
        render: (row: VolunteerBookingDetail) => (
          <>
            {formatTime(row.start_time ?? '')} - {formatTime(row.end_time ?? '')}
          </>
        ),
      },
      {
        field: 'status',
        header: 'Status',
        render: row => statusLabels[row.status ?? ''] ?? row.status ?? '',
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
                Manage
              </Button>
              {row.recurring_id && (
                <Button
                  onClick={() => setCancelRecurring(row)}
                  variant="outlined"
                  color="primary"
                >
                  Cancel All Upcoming
                </Button>
              )}
            </>
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      {history.length === 0 ? (
        <Typography align="center">No bookings</Typography>
      ) : (
        <ResponsiveTable
          rows={history}
          columns={columns}
          getRowKey={r => r.id}
        />
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Shift history only includes records from the past year. Cancelled or
        completed shifts older than one year are archived.
      </Typography>
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
          message="Cancel all upcoming shifts?"
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
