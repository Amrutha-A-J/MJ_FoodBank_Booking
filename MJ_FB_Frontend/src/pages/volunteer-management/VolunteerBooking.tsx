import { useState, useEffect, useRef } from 'react';
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
  Divider,
  Stack,
  Button,
  Skeleton,
} from '@mui/material';
import InfoTooltip from '../../components/InfoTooltip';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import type { VolunteerRole } from '../../types';
import {
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  resolveVolunteerBookingConflict,
} from '../../api/volunteers';
import type { ApiError } from '../../api/client';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { formatTime } from '../../utils/time';
import Page from '../../components/Page';
import OverlapBookingDialog from '../../components/OverlapBookingDialog';
import useHolidays from '../../hooks/useHolidays';

function useVolunteerSlots(
  date: Dayjs,
  enabled: boolean,
  staleTime = 5 * 60 * 1000,
  cacheTime = 30 * 60 * 1000,
) {
  const dateStr = date.format('YYYY-MM-DD');
  const { data, isFetching, refetch, error } = useQuery<VolunteerRole[]>({
    queryKey: ['volunteer-slots', dateStr],
    queryFn: () => getVolunteerRolesForVolunteer(dateStr),
    enabled,
    staleTime,
    cacheTime,
  });
  return { slots: data ?? [], isLoading: isFetching, refetch, error };
}

export default function VolunteerBooking() {
  const [date, setDate] = useState<Dayjs>(() => {
    let d = dayjs();
    while (d.day() === 0 || d.day() === 6) d = d.add(1, 'day');
    return d;
  });
  const [selected, setSelected] = useState<VolunteerRole | null>(null);
  const { holidays } = useHolidays();
  const holidaySet = new Set(holidays.map(h => h.date));
  const isDisabled = (d: Dayjs) =>
    d.day() === 0 ||
    d.day() === 6 ||
    holidaySet.has(d.format('YYYY-MM-DD'));
  const { slots, isLoading, refetch, error } = useVolunteerSlots(
    date,
    !isDisabled(date),
  );
  const [booking, setBooking] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [conflict, setConflict] = useState<{
    attempted: any;
    existing: any;
  } | null>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDisabled(date)) return;
    let next = date;
    while (isDisabled(next)) next = next.add(1, 'day');
    setDate(next);
    setSelected(null);
  }, [date, holidays]);

  const groups = slots.reduce<Record<string, VolunteerRole[]>>((acc, s) => {
    acc[s.name] = acc[s.name] ? [...acc[s.name], s] : [s];
    return acc;
  }, {});
  const roleNames = Object.keys(groups);

  async function handleBook() {
    if (!selected) return;
    setBooking(true);
    try {
      await requestVolunteerBooking(selected.id, selected.date);
      setSnackbar({ open: true, message: 'Shift booked', severity: 'success' });
      setSelected(null);
      refetch();
    } catch (e) {
      const err = e as ApiError;
      const details = err.details as any;
      if (err.status === 409 && details?.attempted && details?.existing) {
        setConflict({ attempted: details.attempted, existing: details.existing });
      } else {
        setSnackbar({
          open: true,
          message: err.message || 'Failed to request slot',
          severity: 'error',
        });
      }
    } finally {
      setBooking(false);
    }
  }

  async function resolveConflict(choice: 'existing' | 'new') {
    if (!conflict) return;
    try {
      await resolveVolunteerBookingConflict(
        conflict.existing.id,
        conflict.attempted.role_id,
        conflict.attempted.date,
        choice,
      );
      setSnackbar({
        open: true,
        message:
          choice === 'new'
            ? 'Booking replaced'
            : 'Kept existing booking',
        severity: 'success',
      });
      refetch();
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to resolve conflict',
        severity: 'error',
      });
    } finally {
      setConflict(null);
      setSelected(null);
    }
  }

  function renderSlot(slot: VolunteerRole) {
    const label = `${formatTime(slot.start_time)}–${formatTime(slot.end_time)}`;
    const needed =
      slot.available === 0
        ? 'We have enough volunteers for this role and shift'
        : `${slot.available} more volunteer${slot.available === 1 ? '' : 's'} needed`;
    return (
      <ListItemButton
        key={slot.id}
        disabled={slot.available === 0}
        selected={selected?.id === slot.id}
        onClick={() => setSelected(slot)}
      >
        <ListItemText primary={label} secondary={needed} />
      </ListItemButton>
    );
  }

  return (
    <Page title="Volunteer Booking">
      <Container sx={{ pb: 8 }}>
        <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={4}>
          <Paper
            sx={{ p: 2, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <DateCalendar
              value={date}
              onChange={newDate => newDate && setDate(newDate)}
              shouldDisableDate={isDisabled}
              sx={{ width: '100%', '& .MuiPickersSlideTransition-root': { minWidth: 0 } }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md sx={{ flexGrow: 1 }}>
          <Paper
            ref={slotsRef}
            sx={{ p: 2, borderRadius: 2, maxHeight: { xs: 420, md: 560 }, overflow: 'auto' }}
          >
            {isLoading ? (
              <Box>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </Box>
            ) : error ? (
              <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>
                  {error instanceof Error ? error.message : 'Error loading slots'}
                </Typography>
              </Box>
            ) : roleNames.length === 0 ? (
              <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>No slots available. Please choose another date.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {roleNames.map((role, idx) => (
                  <Box key={role}>
                    <ListSubheader disableSticky>{role}</ListSubheader>
                    {groups[role].map(renderSlot)}
                    {idx < roleNames.length - 1 && <Divider />}
                  </Box>
                ))}
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
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography>
              {selected
                ? `${selected.name} • ${formatTime(selected.start_time)}–${formatTime(selected.end_time)} on ${date.format('ddd, MMM D, YYYY')}`
                : 'No slot selected'}
            </Typography>
            <InfoTooltip title="Select a slot above, then click Request shift to book it." />
          </Stack>
          <Button
            variant="contained"
            size="small"
            disabled={!selected || booking}
            onClick={handleBook}
          >
            Request shift
          </Button>
        </Stack>
      </Paper>
        {conflict && (
          <OverlapBookingDialog
            open
            attempted={conflict.attempted}
            existing={conflict.existing}
            onClose={() => setConflict(null)}
            onResolve={resolveConflict}
          />
        )}
        <FeedbackSnackbar
          open={snackbar.open}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          message={snackbar.message}
          severity={snackbar.severity}
          duration={4000}
        />
      </Container>
    </Page>
  );
}

