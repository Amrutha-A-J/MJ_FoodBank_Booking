import { useState } from 'react';
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
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AccessTime } from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import type { Slot } from '../types';
import { getSlots, createBooking } from '../api/bookings';
import FeedbackSnackbar from '../components/FeedbackSnackbar';

// Wrappers to match required signatures
function useSlots(date: Dayjs) {
  const dateStr = date.format('YYYY-MM-DD');
  const { data, isFetching, refetch, error } = useQuery<Slot[]>({
    queryKey: ['slots', dateStr],
    queryFn: () => getSlots(dateStr),
  });
  return { slots: data ?? [], isLoading: isFetching, refetch, error };
}

function bookSlot(payload: { date: string; slotId: string }): Promise<void> {
  return createBooking(payload.slotId, payload.date);
}

export type BookingUIProps = {
  shopperName?: string;
  initialDate?: Dayjs;
};

export default function BookingUI({
  shopperName = 'John Shopper',
  initialDate = dayjs(),
}: BookingUIProps) {
  const [date, setDate] = useState<Dayjs>(initialDate);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { slots, isLoading, refetch, error } = useSlots(date);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [booking, setBooking] = useState(false);

  const morningSlots = slots.filter(s =>
    dayjs(s.startTime, 'HH:mm:ss').hour() < 12,
  );
  const afternoonSlots = slots.filter(s =>
    dayjs(s.startTime, 'HH:mm:ss').hour() >= 12,
  );

  async function handleBook() {
    if (!selectedSlotId) return;
    setBooking(true);
    try {
      await bookSlot({
        date: date.format('YYYY-MM-DD'),
        slotId: selectedSlotId,
      });
      setSnackbar({
        open: true,
        message: 'Slot booked successfully',
        severity: 'success',
      });
      setSelectedSlotId(null);
      refetch();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Booking failed',
        severity: 'error',
      });
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
        aria-label={`Select ${start.format('h:mm a')} to ${end.format('h:mm a')} time slot`}
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
            isFull ? (slot.reason ? slot.reason : 'Fully booked') : 'Choose this time'
          }
        />
        <Chip
          label={isFull ? 'Full' : `Available: ${available}`}
          color={isFull ? 'default' : 'success'}
          size="small"
        />
      </ListItemButton>
    );
  }

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const selectedLabel = selectedSlot
    ? `${dayjs(selectedSlot.startTime, 'HH:mm:ss').format('h:mm a')} – ${dayjs(
        selectedSlot.endTime,
        'HH:mm:ss',
      ).format('h:mm a')}`
    : '';

  return (
    <Container maxWidth="lg" sx={{ pb: { xs: 9, md: 0 } }}>
      <Toolbar />
      <Typography variant="h5" gutterBottom>
        Booking for: {shopperName}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
      >
        <AccessTime fontSize="small" />
        Available Slots for {date.format('ddd, MMM D')}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md="auto">
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <DateCalendar
              value={date}
              onChange={newDate => {
                if (newDate) {
                  setDate(newDate);
                  setSelectedSlotId(null);
                }
              }}
              sx={{
                width: '100%',
                maxWidth: 320,
                mx: 'auto',
                '& .MuiPickersSlideTransition-root': { minWidth: 0 },
              }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md sx={{ flexGrow: 1 }}>
          <Paper
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
                <Typography>{error instanceof Error ? error.message : 'Error loading slots'}</Typography>
              </Box>
            ) : slots.length === 0 ? (
              <Box
                sx={{
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography>
                  No slots available. Please choose another date.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {morningSlots.length > 0 && (
                  <>
                    <ListSubheader disableSticky>Morning</ListSubheader>
                    {morningSlots.map(renderSlot)}
                    {afternoonSlots.length > 0 && <Divider />}
                  </>
                )}
                {afternoonSlots.length > 0 && (
                  <>
                    <ListSubheader disableSticky>Afternoon</ListSubheader>
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
          position: { xs: 'fixed', md: 'sticky' },
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
              ? `Selected: ${selectedLabel} on ${date.format('MMM D')}`
              : 'No slot selected'}
          </Typography>
          <Button
            variant="contained"
            size="small"
            disabled={!selectedSlotId || booking}
            onClick={handleBook}
          >
            Book selected slot
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
    </Container>
  );
}

