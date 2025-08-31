
import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Chip,
  Divider,
  Stack,
  Button,
  Toolbar,
  Skeleton,
  Link,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import AccessTime from '@mui/icons-material/AccessTime';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import type { Slot } from '../types';
import { getSlots, createBooking } from '../api/bookings';
import useHolidays from '../hooks/useHolidays';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import FeedbackModal from '../components/FeedbackModal';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../components/Page';
import type { ApiError } from '../api/client';
import { useTranslation } from 'react-i18next';

// Wrappers to match required signatures
function useSlots(
  date: Dayjs,
  enabled: boolean,
  staleTime = 5 * 60 * 1000,
  cacheTime = 30 * 60 * 1000,
) {
  const dateStr = date.format('YYYY-MM-DD');
  const { data, isFetching, refetch, error } = useQuery<Slot[]>({
    queryKey: ['slots', dateStr],
    queryFn: () => getSlots(dateStr),
    enabled,
    staleTime,
    cacheTime,
  });
  return { slots: data ?? [], isLoading: isFetching, refetch, error };
}

function bookSlot(payload: { date: string; slotId: string; userId?: number }): Promise<void> {
  return createBooking(payload.slotId, payload.date, payload.userId);
}

export type BookingUIProps = {
  shopperName?: string;
  initialDate?: Dayjs;
  userId?: number;
  embedded?: boolean;
  onLoadingChange?: (loading: boolean) => void;
};

export default function BookingUI({
  shopperName = 'John Shopper',
  initialDate = dayjs(),
  userId,
  embedded = false,
  onLoadingChange,
}: BookingUIProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState<Dayjs>(() => {
    let d = initialDate;
    const today = dayjs();
    if (d.isBefore(today, 'day')) {
      d = today;
    }
    while (d.day() === 0 || d.day() === 6) {
      d = d.add(1, 'day');
    }
    return d;
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { holidays, refetch: refetchHolidays } = useHolidays(false);
  const [holidaysReady, setHolidaysReady] = useState(false);
  useEffect(() => {
    refetchHolidays().finally(() => setHolidaysReady(true));
  }, [refetchHolidays]);
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const isDisabled = (d: Dayjs) =>
    d.day() === 0 ||
    d.day() === 6 ||
    d.isBefore(dayjs(), 'day') ||
    holidaySet.has(d.format('YYYY-MM-DD'));
  const { slots, isLoading, refetch, error } = useSlots(date, !isDisabled(date));
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [modal, setModal] = useState<{ open: boolean; message: ReactNode }>({
    open: false,
    message: null,
  });
  const [booking, setBooking] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const slotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDisabled(date)) return;
    let next = date;
    while (isDisabled(next)) {
      next = next.add(1, 'day');
    }
    setDate(next);
    setSelectedSlotId(null);
  }, [date, holidays]);

  const visibleSlots = useMemo(() => {
    const now = dayjs();
    return !date.isSame(now, 'day')
      ? slots
      : slots.filter(s => !dayjs(s.startTime, 'HH:mm:ss').isBefore(now));
  }, [slots, date]);
  const morningSlots = useMemo(
    () => visibleSlots.filter(s => dayjs(s.startTime, 'HH:mm:ss').hour() < 12),
    [visibleSlots],
  );
  const afternoonSlots = useMemo(
    () => visibleSlots.filter(s => dayjs(s.startTime, 'HH:mm:ss').hour() >= 12),
    [visibleSlots],
  );
  useEffect(() => {
    onLoadingChange?.(isLoading || !holidaysReady);
  }, [isLoading, holidaysReady, onLoadingChange]);

  useEffect(() => {
    if (selectedSlotId && !visibleSlots.some(s => s.id === selectedSlotId)) {
      setSelectedSlotId(null);
    }
  }, [selectedSlotId, visibleSlots]);

  async function handleBook() {
    if (!selectedSlotId || !visibleSlots.some(s => s.id === selectedSlotId)) return;
    setBooking(true);
    try {
      await bookSlot({
        date: date.format('YYYY-MM-DD'),
        slotId: selectedSlotId,
        userId,
      });
      setSnackbar({
        open: true,
        message: t('slot_booked_success'),
        severity: 'success',
      });
      setSelectedSlotId(null);
      refetch();
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'details' in err &&
        'message' in err
      ) {
        const apiErr = err as ApiError;
        const existing = (apiErr.details as any)?.existingBooking;
        if (existing) {
          const dateStr = dayjs(existing.date).format('ddd, MMM D, YYYY');
          const timeStr = dayjs(existing.start_time, 'HH:mm:ss').format('h:mm A');
          const status = existing.status;
          setModal({
            open: true,
            message: (
              <Stack spacing={2}>
                <Typography>
                  You already have an {status} appointment on {dateStr} at {timeStr}.
                </Typography>
                <Typography>
                  If you need to reschedule, please do so from your bookings{' '}
                  <Link component={RouterLink} to="/booking-history" underline="hover">
                    page
                  </Link>
                  .
                </Typography>
                <Typography>
                  Our services are for emergencies, so we don’t encourage auto-booking
                  weeks ahead.
                </Typography>
                <Typography>
                  After completing this appointment, you may book another if needed.
                </Typography>
              </Stack>
            ),
          });
        } else {
          setSnackbar({
            open: true,
            message:
              typeof apiErr.message === 'string'
                ? apiErr.message
                : t('booking_failed'),
            severity: 'error',
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: t('booking_failed'),
          severity: 'error',
        });
      }
    } finally {
      setBooking(false);
    }
  }

  function renderSlot(slot: Slot) {
    const start = dayjs(slot.startTime, 'HH:mm:ss');
    const end = dayjs(slot.endTime, 'HH:mm:ss');
    const label = `${start.format('h:mm a')} – ${end.format('h:mm a')}`;
    const available = slot.available ?? 0;
    const isFull = available <= 0;
    const selected = selectedSlotId === slot.id;
    return (
      <ListItemButton
        key={slot.id}
        disabled={isFull}
        selected={selected}
        onClick={() => setSelectedSlotId(slot.id)}
        aria-label={t('select_time_slot', {
          start: start.format('h:mm a'),
          end: end.format('h:mm a'),
        })}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          pl: 2,
          ...(selected && {
            bgcolor: 'action.selected',
            borderLeft: theme => `3px solid ${theme.palette.primary.main}`,
          }),
        }}
      >
        <ListItemText
          primary={label}
          secondary={
            isFull
              ? slot.reason || t('fully_booked')
              : t('choose_this_time')
          }
        />
        <Chip
          label={
            isFull
              ? t('full')
              : t('available_count', { count: available })
          }
          color={isFull ? 'default' : 'success'}
          size="small"
        />
      </ListItemButton>
    );
  }

  const selectedSlot = visibleSlots.find(s => s.id === selectedSlotId);
  const selectedLabel = selectedSlot
    ? `${dayjs(selectedSlot.startTime, 'HH:mm:ss').format('h:mm a')} – ${dayjs(
        selectedSlot.endTime,
        'HH:mm:ss',
      ).format('h:mm a')}`
    : '';

  const content = (
      <Container maxWidth="lg" sx={{ pb: 9 }}>
      <Toolbar />
      <Typography variant="h5" gutterBottom>
        {t('booking_for', { name: shopperName })}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
      >
        <AccessTime fontSize="small" />
        {t('available_slots_for', { date: date.format('ddd, MMM D, YYYY') })}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md="auto">
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            {!holidaysReady ? (
              <Skeleton variant="rectangular" height={296} />
            ) : (
              <DateCalendar
                value={date}
                shouldDisableDate={isDisabled}
                onChange={newDate => {
                  if (newDate && !isDisabled(newDate)) {
                    setDate(newDate);
                    setSelectedSlotId(null);
                    if (isMobile) {
                      setTimeout(() => {
                        if (slotsRef.current) {
                          slotsRef.current.scrollTo({
                            top: 0,
                            behavior: 'smooth',
                          });
                          slotsRef.current.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 0);
                    }
                  }
                }}
                sx={{
                  width: '100%',
                  maxWidth: 320,
                  mx: 'auto',
                  '& .MuiPickersSlideTransition-root': { minWidth: 0 },
                }}
              />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md sx={{ flexGrow: 1 }}>
          <Paper
            ref={slotsRef}
            sx={{
              p: 2,
              borderRadius: 2,
              maxHeight: { xs: 420, md: 560 },
              overflow: 'auto',
            }}
          >
            {isLoading ? (
              <Box>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={56}
                    sx={{ mb: 1, borderRadius: 1 }}
                  />
                ))}
              </Box>
            ) : error ? (
              <Box
                sx={{
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography>
                  {error instanceof Error ? error.message : t('error_loading_slots')}
                </Typography>
              </Box>
            ) : visibleSlots.length === 0 ? (
              <Box
                sx={{
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography>{t('no_slots_available')}</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {morningSlots.length > 0 && (
                  <>
                    <ListSubheader disableSticky>{t('morning')}</ListSubheader>
                    {morningSlots.map(renderSlot)}
                    {afternoonSlots.length > 0 && <Divider />}
                  </>
                )}
                {afternoonSlots.length > 0 && (
                  <>
                    <ListSubheader disableSticky>{t('afternoon')}</ListSubheader>
                    {afternoonSlots.map(renderSlot)}
                  </>
                )}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          mt: 2,
          p: 2,
          borderRadius: { xs: 0, md: 2 },
          zIndex: theme => theme.zIndex.appBar,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography>
            {selectedSlotId
              ? t('selected_on', {
                  slot: selectedLabel,
                  date: date.format('ddd, MMM D, YYYY'),
                })
              : t('no_slot_selected')}
          </Typography>
          <Button
            variant="contained"
            size="small"
            disabled={!selectedSlotId || booking}
            onClick={handleBook}
          >
            {t('book_selected_slot')}
          </Button>
        </Stack>
      </Paper>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
        duration={4000}
      />
      <FeedbackModal
        open={modal.open}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        message={modal.message}
        severity="warning"
      />
    </Container>
  );

  if (embedded) return content;
  return <Page title={t('book_appointment')}>{content}</Page>;
}

