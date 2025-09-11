import { useState, useEffect, useCallback, type ReactNode } from 'react';
import EntitySearch from '../../components/EntitySearch';
import BookingHistoryTable, { type BookingHistoryItem } from '../../components/BookingHistoryTable';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import DialogCloseButton from '../../components/DialogCloseButton';
import { useTranslation } from 'react-i18next';
import getApiErrorMessage from '../../utils/getApiErrorMessage';
import type { AlertColor } from '@mui/material';

type MessageHandler = (severity: AlertColor, message: string) => void;

export interface BookingManagementBaseProps<T extends BookingHistoryItem, E extends { name: string }> {
  searchType: 'user' | 'volunteer';
  searchPlaceholder: string;
  getId: (entity: E) => number;
  loadHistory: (entityId: number) => Promise<T[]>;
  cancelBooking: (bookingId: number) => Promise<void>;
  cancelSeries?: (recurringId: number) => Promise<void>;
  onReschedule?: (booking: T, reload: () => void) => void;
  renderEntityActions?: (entity: E, reload: () => void) => ReactNode;
  renderExtraActions?: (booking: T, isSmall: boolean, reload: () => void) => ReactNode;
  showRole?: boolean;
  showReason?: boolean;
  showStaffNotes?: boolean;
  getRowKey?: (row: T, index: number) => React.Key;
  initialEntity?: E;
  reloadDeps?: any[];
  onMessage?: MessageHandler;
  onSelect?: (entity: E) => void;
}

export default function BookingManagementBase<T extends BookingHistoryItem, E extends { name: string }>({
  searchType,
  searchPlaceholder,
  getId,
  loadHistory,
  cancelBooking,
  cancelSeries,
  onReschedule,
  renderEntityActions,
  renderExtraActions,
  showRole,
  showReason,
  showStaffNotes,
  getRowKey,
  initialEntity,
  reloadDeps = [],
  onMessage,
  onSelect,
}: BookingManagementBaseProps<T, E>) {
  const [selected, setSelected] = useState<E | null>(initialEntity || null);
  const [bookings, setBookings] = useState<T[]>([]);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelSeriesId, setCancelSeriesId] = useState<number | null>(null);
  const { t } = useTranslation();

  const reload = useCallback(() => {
    if (!selected) return;
    loadHistory(getId(selected))
      .then(setBookings)
      .catch(err => {
        onMessage?.('error', getApiErrorMessage(err, 'Failed to load booking history'));
      });
  }, [selected, loadHistory, getId, onMessage]);

  useEffect(() => {
    if (selected) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, ...reloadDeps]);

  async function confirmCancel() {
    if (cancelId == null) return;
    try {
      await cancelBooking(cancelId);
      onMessage?.('success', t('booking_cancelled'));
      reload();
    } catch (err: unknown) {
      onMessage?.('error', getApiErrorMessage(err, 'Unable to cancel booking'));
    } finally {
      setCancelId(null);
    }
  }

  async function confirmCancelSeries() {
    if (cancelSeriesId == null || !cancelSeries) return;
    try {
      await cancelSeries(cancelSeriesId);
      onMessage?.('success', t('series_cancelled'));
      reload();
    } catch (err: unknown) {
      onMessage?.('error', getApiErrorMessage(err, 'Unable to cancel series'));
    } finally {
      setCancelSeriesId(null);
    }
  }

  return (
    <Box>
      {!initialEntity && (
        <EntitySearch
          type={searchType}
          placeholder={searchPlaceholder}
          onSelect={e => {
            setSelected(e as E);
            onSelect?.(e as E);
          }}
        />
      )}
      {selected && (
        <>
          <Box mt={2}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6">{selected.name}</Typography>
              {renderEntityActions && renderEntityActions(selected, reload)}
            </Box>
            {bookings.length === 0 ? (
              <Typography align="center">{t('no_bookings')}</Typography>
            ) : (
              <BookingHistoryTable
                rows={bookings}
                showRole={showRole}
                showReason={showReason}
                showStaffNotes={showStaffNotes}
                onCancel={b => setCancelId(b.id)}
                onReschedule={onReschedule ? b => onReschedule(b, reload) : undefined}
                onCancelSeries={cancelSeries ? id => setCancelSeriesId(id) : undefined}
                renderExtraActions={
                  renderExtraActions
                    ? (b, isSmall) => renderExtraActions(b, isSmall, reload)
                    : undefined
                }
                getRowKey={getRowKey}
              />
            )}
          </Box>

          <Dialog open={cancelId !== null} onClose={() => setCancelId(null)}>
            <DialogCloseButton onClose={() => setCancelId(null)} />
            <DialogTitle>{t('cancel_booking')}</DialogTitle>
            <DialogContent>
              <Typography>{t('cancel_booking_question')}</Typography>
            </DialogContent>
            <DialogActions>
              <Button color="error" variant="contained" onClick={confirmCancel}>
                {t('cancel_booking')}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={cancelSeriesId !== null} onClose={() => setCancelSeriesId(null)}>
            <DialogCloseButton onClose={() => setCancelSeriesId(null)} />
            <DialogTitle>{t('cancel_series')}</DialogTitle>
            <DialogContent>
              <Typography>{t('cancel_all_upcoming')}</Typography>
            </DialogContent>
            <DialogActions>
              <Button
                color="error"
                variant="contained"
                onClick={confirmCancelSeries}
              >
                {t('cancel_series')}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}

