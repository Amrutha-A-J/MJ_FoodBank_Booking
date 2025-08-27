import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  createRecurringVolunteerBooking,
  getMyVolunteerBookings,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
} from '../../api/volunteers';
import { getHolidays } from '../../api/bookings';
import type {
  VolunteerRole,
  Holiday,
  VolunteerBooking,
  VolunteerRoleGroup,
} from '../../types';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { formatTime } from '../../utils/time';
import VolunteerScheduleTable from '../../components/VolunteerScheduleTable';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import RescheduleDialog from '../../components/VolunteerRescheduleDialog';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import { lighten } from '@mui/material/styles';
import type { AlertColor } from '@mui/material';

const reginaTimeZone = 'America/Regina';

export default function VolunteerSchedule() {
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM-dd');
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [roleGroups, setRoleGroups] = useState<VolunteerRoleGroup[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('');
  const [requestRole, setRequestRole] = useState<VolunteerRole | null>(null);
  const [decisionBooking, setDecisionBooking] =
    useState<VolunteerBooking | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [rescheduleBooking, setRescheduleBooking] =
    useState<VolunteerBooking | null>(null);
  const [frequency, setFrequency] =
    useState<'one-time' | 'daily' | 'weekly'>('one-time');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const theme = useTheme();
  const approvedColor = lighten(theme.palette.success.light, 0.4);

  const formatDate = (date: Date) =>
    formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    const dateStr = formatDate(currentDate);
    const reginaDate = toZonedTime(currentDate, reginaTimeZone);
    const weekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
    const holiday = holidays.some(h => h.date === dateStr);
    try {
      const [roleData, bookingData] = await Promise.all([
        getVolunteerRolesForVolunteer(dateStr),
        getMyVolunteerBookings(),
      ]);
      const disallowed = weekend || holiday
        ? ['Pantry', 'Warehouse', 'Administrative']
        : [];
      const filteredRoles = roleData.filter(
        (r: VolunteerRole) => !disallowed.includes(r.category_name),
      );
      const map = new Map<number, VolunteerRoleGroup>();
      filteredRoles.forEach((r: VolunteerRole) => {
        const group =
          map.get(r.category_id) || {
            category_id: r.category_id,
            category: r.category_name,
            roles: [],
          };
        let role = group.roles.find(g => g.id === r.role_id);
        if (!role) {
          role = { id: r.role_id, name: r.name, slots: [] };
          group.roles.push(role);
        }
        role.slots.push(r);
        map.set(r.category_id, group);
      });
      const groups = Array.from(map.values());
      setRoleGroups(groups);
      const keys = new Set(
        groups.flatMap(g => g.roles.map(r => `${g.category_id}|${r.id}`)),
      );
      setSelectedRoleKey(prev => (prev && keys.has(prev) ? prev : ''));

      const allowedIds = new Set(filteredRoles.map(r => r.id));
      const filteredBookings = bookingData.filter(
        (b: VolunteerBooking) =>
          b.date === dateStr &&
          ['approved', 'pending'].includes(b.status) &&
          allowedIds.has(b.role_id),
      );
      setBookings(filteredBookings);
    } catch (err) {
      console.error(err);
    }
  }, [currentDate, holidays]);

  useEffect(() => {
    getHolidays().then(setHolidays).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function changeDay(delta: number) {
    setCurrentDate(d => new Date(d.getTime() + delta * 86400000));
  }

  async function submitRequest() {
    if (!requestRole) return;
    try {
      if (frequency === 'one-time') {
        await requestVolunteerBooking(
          requestRole.id,
          formatDate(currentDate),
        );
      } else {
        await createRecurringVolunteerBooking(
          requestRole.id,
          formatDate(currentDate),
          frequency,
          frequency === 'weekly' ? weekdays : undefined,
          endDate || undefined,
        );
      }
      const dateLabel = formatInTimeZone(
        currentDate,
        reginaTimeZone,
        'EEE, MMM d',
      );
      const timeLabel = `${formatTime(requestRole.start_time)}–${formatTime(
        requestRole.end_time,
      )}`;
      setSnackbarSeverity('success');
      setMessage(`Booking request for ${dateLabel} · ${timeLabel} submitted`);
      setRequestRole(null);
      await loadData();
    } catch (err) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelSelected() {
    if (!decisionBooking) return;
    try {
      await cancelVolunteerBooking(decisionBooking.id);
      setSnackbarSeverity('success');
      setMessage('Booking cancelled');
      await loadData();
    } catch {
      setSnackbarSeverity('error');
      setMessage('Failed to cancel booking');
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
    }
  }

  async function cancelSeries() {
    if (!decisionBooking?.recurring_id) return;
    try {
      await cancelRecurringVolunteerBooking(
        decisionBooking.recurring_id,
      );
      setSnackbarSeverity('success');
      setMessage('Series cancelled');
      await loadData();
    } catch {
      setSnackbarSeverity('error');
      setMessage('Failed to cancel series');
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
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
      setMessage('Booking rescheduled');
      await loadData();
    } catch {
      setSnackbarSeverity('error');
      setMessage('Failed to reschedule booking');
    } finally {
      setRescheduleBooking(null);
    }
  }

  const dateStr = formatDate(currentDate);
  const reginaDate = toZonedTime(currentDate, reginaTimeZone);
  const dayName = formatInTimeZone(currentDate, reginaTimeZone, 'EEEE');
  const holidayObj = holidays.find(h => h.date === dateStr);
  const isHoliday = !!holidayObj;
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const allowedOnClosed = ['Gardening', 'Special Events'];
  const [selectedCategoryId, selectedRoleId] = selectedRoleKey.split('|');
  const selectedCategory = roleGroups.find(
    g => g.category_id === Number(selectedCategoryId),
  )?.category;
  const isClosed =
    (isHoliday || isWeekend) &&
    (!selectedCategory || !allowedOnClosed.includes(selectedCategory));

  const roleSlots = selectedRoleKey
    ? (
        roleGroups
          .find(g => g.category_id === Number(selectedCategoryId))
          ?.roles.find(r => r.id === Number(selectedRoleId))?.slots || []
      ).sort((a, b) => a.start_time.localeCompare(b.start_time))
    : [];
  const maxSlots = Math.max(0, ...roleSlots.map(r => r.max_volunteers));
  const showClosedMessage = (isHoliday || isWeekend) && roleGroups.length === 0;
  const rows = roleSlots.map(role => {
    const myBooking = bookings.find(b => b.role_id === role.id);
    const othersBooked = Math.max(0, role.booked - (myBooking ? 1 : 0));
    const cells: {
      content: ReactNode;
      backgroundColor?: string;
      onClick?: () => void;
    }[] = [];
    if (myBooking) {
      cells.push({
        content: 'My Booking',
        backgroundColor:
          myBooking.status === 'pending'
            ? theme.palette.warning.light
            : approvedColor,
        onClick: () => {
          setDecisionBooking(myBooking);
          setDecisionReason('');
        },
      });
    }
    for (let i = cells.length; i < role.max_volunteers; i++) {
      if (i - (myBooking ? 1 : 0) < othersBooked) {
        cells.push({
          content: 'Booked',
          backgroundColor: theme.palette.grey[200],
        });
      } else {
        cells.push({
          content: (
            <>
              Volunteer Needed
              <br />
              Click Here to Book
            </>
          ),
          onClick: () => {
            if (!isClosed) {
              setFrequency('one-time');
              setWeekdays([reginaDate.getDay()]);
              setEndDate('');
              setRequestRole(role);
              setMessage('');
            } else {
              setSnackbarSeverity('error');
              setMessage('Booking not allowed on weekends or holidays');
            }
          },
        });
      }
    }
    return {
      time: `${formatTime(role.start_time)} - ${formatTime(role.end_time)}`,
      cells,
    };
  });

  return (
    <Box>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="role-select-label">Role</InputLabel>
        <Select
          labelId="role-select-label"
          value={selectedRoleKey}
          label="Role"
          onChange={e => setSelectedRoleKey(e.target.value)}
        >
          <MenuItem value="">Select role</MenuItem>
          {roleGroups.flatMap(g => [
            <ListSubheader key={`${g.category_id}-header`}>
              {g.category}
            </ListSubheader>,
            ...g.roles.map(r => (
              <MenuItem
                key={`${g.category_id}-${r.id}`}
                value={`${g.category_id}|${r.id}`}
              >
                {r.name}
              </MenuItem>
            )),
          ])}
        </Select>
      </FormControl>
      {selectedRoleKey ? (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Button onClick={() => changeDay(-1)} variant="outlined" color="primary">Previous</Button>
            <Typography variant="h6" component="h3">
              {dateStr} - {dayName}
              {isHoliday
                ? ` (Holiday${holidayObj?.reason ? ': ' + holidayObj.reason : ''})`
                : isWeekend
                  ? ' (Weekend)'
                  : ''}
            </Typography>
            <Button onClick={() => changeDay(1)} variant="outlined" color="primary">Next</Button>
          </Box>
          <FeedbackSnackbar
            open={!!message}
            onClose={() => setMessage('')}
            message={message}
            severity={snackbarSeverity}
          />
          {isClosed ? (
            <Typography align="center">
              Moose Jaw food bank is closed for {dayName}
            </Typography>
          ) : (
            <VolunteerScheduleTable maxSlots={maxSlots} rows={rows} />
          )}
        </>
      ) : showClosedMessage ? (
        <Typography align="center" sx={{ mt: 2 }}>
          Moose Jaw food bank is closed for {dayName}
        </Typography>
      ) : null}

      <Dialog open={!!requestRole} onClose={() => setRequestRole(null)}>
        <DialogTitle>Request Booking</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 2 }}>
            Request booking for {requestRole?.name}?
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="freq-label">Frequency</InputLabel>
            <Select
              labelId="freq-label"
              value={frequency}
              label="Frequency"
              onChange={e =>
                setFrequency(e.target.value as 'one-time' | 'daily' | 'weekly')
              }
            >
              <MenuItem value="one-time">One-time</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
            </Select>
          </FormControl>
          {frequency === 'weekly' && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <FormControlLabel
                  key={d}
                  control={
                    <Checkbox
                      size="small"
                      checked={weekdays.includes(i)}
                      onChange={() =>
                        setWeekdays(prev =>
                          prev.includes(i)
                            ? prev.filter(x => x !== i)
                            : [...prev, i],
                        )
                      }
                    />
                  }
                  label={d}
                />
              ))}
            </Box>
          )}
          {(frequency === 'daily' || frequency === 'weekly') && (
              <TextField
                label="End date"
                type="date"
                size="small"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={submitRequest} variant="outlined" color="primary">
            Submit
          </Button>
          <Button
            onClick={() => setRequestRole(null)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!decisionBooking}
        onClose={() => {
          setDecisionBooking(null);
          setDecisionReason('');
        }}
      >
        <DialogTitle>Manage Booking</DialogTitle>
        <DialogContent dividers>
          <Typography>Modify booking for {decisionBooking?.role_name}?</Typography>
            <TextField
              placeholder="Reason for cancellation"
              value={decisionReason}
              onChange={e => setDecisionReason(e.target.value)}
              fullWidth
              multiline
            />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRescheduleBooking(decisionBooking);
              setDecisionBooking(null);
              setDecisionReason('');
            }}
            variant="outlined"
            color="primary"
          >
            Reschedule
          </Button>
          {decisionBooking?.recurring_id && (
            <Button
              onClick={cancelSeries}
              variant="outlined"
              color="primary"
            >
              Cancel All Upcoming
            </Button>
          )}
          <Button onClick={cancelSelected} variant="outlined" color="primary">
            Cancel Booking
          </Button>
          <Button
            onClick={() => {
              setDecisionBooking(null);
              setDecisionReason('');
            }}
            variant="outlined"
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <RescheduleDialog
        open={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onSubmit={handleReschedule}
      />
    </Box>
  );
}

