
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Chip,
  Divider,
  Stack,
  Button,
  Collapse,
  Toolbar,
  Skeleton,
  Link,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import AccessTime from '@mui/icons-material/AccessTime';
import dayjs, { Dayjs } from '../utils/date';
import { useQuery } from '@tanstack/react-query';
import type { Slot, Holiday, BookingActionResponse } from '../types';
import { getSlots, createBooking } from '../api/bookings';
import { getUserProfile } from '../api/users';
import useHolidays from '../hooks/useHolidays';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import FeedbackModal from '../components/FeedbackModal';
import DialogCloseButton from '../components/DialogCloseButton';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import Page from '../components/Page';
import ClientBottomNav from '../components/ClientBottomNav';
import VolunteerBottomNav from '../components/VolunteerBottomNav';
import type { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function useSlots<T>(
  date: Dayjs,
  enabled: boolean,
  fetchSlots: (date: string) => Promise<T[]>,
  mapSlot: (s: T) => Slot,
  staleTime = 5 * 60 * 1000,
  gcTime = 30 * 60 * 1000,
) {
  const dateStr = date.format('YYYY-MM-DD');
  const { data, isFetching, refetch, error } = useQuery<Slot[]>({
    queryKey: ['slots', dateStr, fetchSlots],
    queryFn: async () => {
      const raw = await fetchSlots(dateStr);
      return raw.map(mapSlot);
    },
    enabled,
    staleTime,
    gcTime,
  });
  return { slots: data ?? [], isLoading: isFetching, refetch, error };
}

function defaultBookSlot(payload: {
  date: string;
  slotId: string;
  note: string;
  userId?: number;
}): Promise<BookingActionResponse> {
  return createBooking(payload.slotId, payload.date, payload.note, payload.userId);
}

export type BookingUIProps<T = Slot> = {
  shopperName?: string;
  initialDate?: Dayjs;
  userId?: number;
  embedded?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  slotFetcher?: (date: string) => Promise<T[]>;
  mapSlot?: (s: T) => Slot;
  bookingAction?: (payload: {
    date: string;
    slotId: string;
    note: string;
    userId?: number;
  }) => Promise<BookingActionResponse>;
  groupSlots?: (slots: Slot[]) => Record<string, Slot[]>;
  showUsageNotes?: boolean;
};

type SlotRowProps = {
  slot: Slot;
  selected: boolean;
  onSelect: () => void;
  onBook: () => void;
  booking: boolean;
  loadingConfirm: boolean;
};

export function SlotRow({
  slot,
  selected,
  onSelect,
  onBook,
  booking,
  loadingConfirm,
}: SlotRowProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const bookWidth = 140;
  const start = dayjs(slot.startTime, 'HH:mm:ss');
  const end = dayjs(slot.endTime, 'HH:mm:ss');
  const label = `${start.format('h:mm a')} – ${end.format('h:mm a')}`;
  const available = slot.available ?? 0;
  const isFull = available <= 0;
  return (
    <ListItem
      key={slot.id}
      disablePadding
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: 1,
        borderColor: 'divider',
        width: '100%',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <ListItemButton
        disabled={isFull}
        selected={selected}
        onClick={onSelect}
        aria-label={`Select time slot from ${start.format('h:mm a')} to ${end.format('h:mm a')}`}
        sx={{
          pl: 2,
          flexGrow: { md: 1 },
          width: { xs: '100%', md: 'auto' },
          ...(isMdUp
            ? {
                mr: selected ? 1 : 0,
                transition: theme.transitions.create('margin-right'),
              }
            : {
                mb: selected ? 1 : 0,
                transition: theme.transitions.create('margin-bottom'),
              }),
          ...(selected && {
            bgcolor: 'warning.light',
            borderLeft: `3px solid ${theme.palette.primary.main}`,
          }),
        }}
      >
        <ListItemText
          primary={label}
          secondary={isFull ? slot.reason || 'Fully booked' : 'Choose this time'}
        />
        <Chip
          label={isFull ? 'Full' : `${available} available`}
          color={isFull ? 'default' : 'success'}
        />
      </ListItemButton>
      <Collapse
        orientation={isMdUp ? 'horizontal' : 'vertical'}
        in={selected}
        unmountOnExit
        sx={isMdUp ? undefined : { width: '100%' }}
      >
        {(() => {
          const label = 'Book selected slot';
          const words = label.split(' ');
          const multiline =
            words.length > 1 ? `${words[0]}\n${words.slice(1).join(' ')}` : label;
          return (
            <Button
              variant="contained"
              size="medium"
              fullWidth={!isMdUp}
              sx={
                isMdUp
                  ? {
                      width: bookWidth,
                      height: '100%',
                      flexShrink: 0,
                      whiteSpace: 'pre-line',
                    }
                  : { width: '100%' }
              }
              disabled={booking || loadingConfirm}
              onClick={onBook}
            >
              {isMdUp ? multiline : label}
            </Button>
          );
        })()}
      </Collapse>
    </ListItem>
  );
}

export default function BookingUI<T = Slot>({
  shopperName,
  initialDate = dayjs(),
  userId,
  embedded = false,
  onLoadingChange,
  slotFetcher = getSlots as unknown as (date: string) => Promise<T[]>,
  mapSlot = ((s: T) => s as unknown as Slot) as (s: T) => Slot,
  bookingAction = defaultBookSlot,
  groupSlots,
  showUsageNotes = true,
}: BookingUIProps<T>) {
  const location = useLocation();
  const { role, name: authName, userRole } = useAuth();
  const isVolunteerSchedule = location.pathname.startsWith('/volunteer/schedule');
  const historyPath = isVolunteerSchedule ? '/volunteer/history' : '/booking-history';
  const historyButtonLabel = isVolunteerSchedule ? 'View shift history' : 'View booking history';
  const pageTitle =
    location.pathname.startsWith('/book-appointment') && userRole === 'shopper'
      ? 'Book shopping appointment'
      : role === 'volunteer'
        ? 'Book volunteer shift'
        : 'Book appointment';
  const historyPath = location.pathname.startsWith('/volunteer/schedule')
    ? '/volunteer/history'
    : location.pathname.startsWith('/book-appointment')
      ? '/booking-history'
      : null;
  const historyLabel =
    historyPath === '/volunteer/history' ? 'View volunteer history' : 'View booking history';
  const displayName = shopperName ?? authName ?? 'John Shopper';

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
  const holidaySet = useMemo(
    () => new Set(holidays.map((h: Holiday) => h.date)),
    [holidays],
  );
  const isDisabled = (d: Dayjs | Date) => {
    const day = dayjs(d);
    return (
      day.day() === 0 ||
      day.day() === 6 ||
      day.isBefore(dayjs(), 'day') ||
      holidaySet.has(day.format('YYYY-MM-DD'))
    );
  };
  const { slots, isLoading, refetch, error } = useSlots(
    date,
    !isDisabled(date),
    slotFetcher,
    mapSlot,
  );
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
    action?: ReactNode;
  }>({ open: false, message: '', severity: 'success' });
  const [modal, setModal] = useState<{ open: boolean; message: ReactNode }>({
    open: false,
    message: null,
  });
  const [booking, setBooking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState('');
  const [usage, setUsage] = useState<number | null>(null);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
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
  const groupedSlots = useMemo(() => {
    if (groupSlots) return groupSlots(visibleSlots);
    const morning = visibleSlots.filter(s =>
      dayjs(s.startTime, 'HH:mm:ss').hour() < 12,
    );
    const afternoon = visibleSlots.filter(s =>
      dayjs(s.startTime, 'HH:mm:ss').hour() >= 12,
    );
    const res: Record<string, Slot[]> = {};
    if (morning.length) res['Morning'] = morning;
    if (afternoon.length) res['Afternoon'] = afternoon;
    return res;
  }, [visibleSlots, groupSlots]);
  useEffect(() => {
    onLoadingChange?.(isLoading || !holidaysReady);
  }, [isLoading, holidaysReady, onLoadingChange]);

  useEffect(() => {
    if (selectedSlotId && !visibleSlots.some(s => s.id === selectedSlotId)) {
      setSelectedSlotId(null);
    }
  }, [selectedSlotId, visibleSlots]);

  useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error loading slots',
        severity: 'error',
      });
    }
  }, [error]);
  async function handleOpenConfirm() {
    if (!selectedSlotId || !visibleSlots.some(s => s.id === selectedSlotId)) return;
    setLoadingConfirm(true);
    setNote('');
    try {
      if (showUsageNotes) {
        const profile = await getUserProfile();
        setUsage(profile.bookingsThisMonth ?? 0);
        setNote(profile.defaultBookingNote ?? '');
      }
      setConfirmOpen(true);
    } finally {
      setLoadingConfirm(false);
    }
  }

  async function handleBook() {
    if (!selectedSlotId || !visibleSlots.some(s => s.id === selectedSlotId)) return;
    setBooking(true);
    try {
      const res = await bookingAction({
        date: date.format('YYYY-MM-DD'),
        slotId: selectedSlotId,
        note,
        userId,
      });
      setSnackbar({
        open: true,
        message: 'Slot booked successfully',
        severity: 'success',
        action:
          res?.googleCalendarUrl || res?.icsUrl ? (
            <Stack direction="row" spacing={1}>
              {res?.googleCalendarUrl && (
                <Button
                  variant="contained"
                  component="a"
                  href={res.googleCalendarUrl}
                  target="_blank"
                  rel="noopener"
                  size="medium"
                  sx={{ minHeight: 48 }}
                >
                  Add to Google Calendar
                </Button>
              )}
              {res?.icsUrl && (
                <Button
                  variant="outlined"
                  component="a"
                  href={res.icsUrl}
                  size="medium"
                  sx={{ minHeight: 48 }}
                >
                  Add to Apple Calendar
                </Button>
              )}
            </Stack>
          ) : undefined,
      });
      setSelectedSlotId(null);
      setNote('');
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
          const timeStr = existing.start_time
            ? dayjs(existing.start_time, 'HH:mm:ss').format('h:mm A')
            : '';
          const status = existing.status;
          setModal({
            open: true,
            message: (
              <Stack spacing={2}>
                <Typography>
                  You already have an {status} appointment on {dateStr}
                  {timeStr ? ` at ${timeStr}` : ''}.
                </Typography>
                <Typography>
                  If you need to reschedule, please do so from your bookings{' '}
                  <Link component={RouterLink} to={historyPath} underline="hover">
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
                : 'Booking failed',
            severity: 'error',
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'Booking failed',
          severity: 'error',
        });
      }
    } finally {
      setBooking(false);
      setConfirmOpen(false);
    }
  }

  function renderSlot(slot: Slot) {
    const selected = selectedSlotId === slot.id;
    return (
      <SlotRow
        key={slot.id}
        slot={slot}
        selected={selected}
        onSelect={() => setSelectedSlotId(slot.id)}
        onBook={handleOpenConfirm}
        booking={booking}
        loadingConfirm={loadingConfirm}
      />
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
    <Container
      maxWidth="xl"
      sx={{
        pb: 9,
        px: { xs: 2, sm: 3, lg: 4, xl: 6 },
      }}
    >
      <Toolbar />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {`Booking for ${displayName}`}
        </Typography>
        <Button
          component={RouterLink}
          to={historyPath}
          variant="outlined"
          size="medium"
          sx={{
            minHeight: 48,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {historyButtonLabel}
        </Button>
      </Stack>
      <Typography
        variant="subtitle1"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
      >
        <AccessTime fontSize="small" />
        {`Available slots for ${date.format('ddd, MMM D, YYYY')}`}
      </Typography>
      <Grid
        container
        spacing={{ xs: 2, md: 3, xl: 4 }}
        sx={{ alignItems: 'stretch' }}
      >
        <Grid size={{ xs: 12, md: 5, lg: 4, xl: 3 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {!holidaysReady ? (
              <Skeleton variant="rectangular" height={296} />
            ) : (
              <DateCalendar
                value={date}
                shouldDisableDate={isDisabled}
                onChange={newDate => {
                  if (newDate && !isDisabled(newDate)) {
                    const d = dayjs(newDate);
                    setDate(d);
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            ref={slotsRef}
            sx={{
              p: 2,
              borderRadius: 2,
              maxHeight: {
                xs: 420,
                md: 'clamp(560px, calc(100vh - 240px), 960px)',
              },
              overflow: 'auto',
              width: '100%',
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
                  {error instanceof Error ? error.message : 'Error loading slots'}
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
                <Typography>No slots available</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {Object.entries(groupedSlots).map(([label, group], idx, arr) => (
                  <Box key={label}>
                    <ListSubheader disableSticky>{label}</ListSubheader>
                    {group.map(renderSlot)}
                    {idx < arr.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogCloseButton onClose={() => setConfirmOpen(false)} />
        <DialogTitle>Confirm booking</DialogTitle>
        <DialogContent>
          <Typography>
            {`Date: ${date.format('ddd, MMM D, YYYY')}`}
          </Typography>
          <Typography>
            {`Time: ${selectedLabel}`}
          </Typography>
          {showUsageNotes && (
            <>
              <Typography>
                {`Visits this month: ${usage ?? 0}`}
              </Typography>
              <TextField
                fullWidth
                multiline
                margin="normal"
                label="Client note"
                value={note}
                onChange={e => setNote(e.target.value)}
                size="medium"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} size="medium" sx={{ minHeight: 48 }}>
            Cancel
          </Button>
          <Button onClick={handleBook} variant="contained" disabled={booking} size="medium" sx={{ minHeight: 48 }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
        duration={4000}
        action={snackbar.action}
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
  return (
    <Page
      title={pageTitle}
      header={
        historyPath ? (
          <Button
            component={RouterLink}
            to={historyPath}
            variant="outlined"
            size="medium"
            sx={{ minHeight: 48 }}
          >
            {historyLabel}
          </Button>
        ) : undefined
      }
    >
      {content}
      {role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </Page>
  );
}

