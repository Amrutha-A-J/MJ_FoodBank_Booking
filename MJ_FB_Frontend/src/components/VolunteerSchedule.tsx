import { useState, useEffect, useCallback } from 'react';
import {
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  getMyVolunteerBookings,
  getHolidays,
  updateVolunteerBookingStatus,
  rescheduleVolunteerBookingByToken,
} from '../api/api';
import type { VolunteerRole, Holiday, VolunteerBooking } from '../types';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { formatTime } from '../utils/time';
import VolunteerScheduleTable from './VolunteerScheduleTable';
import FeedbackSnackbar from './FeedbackSnackbar';
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
} from '@mui/material';

const reginaTimeZone = 'America/Regina';

export default function VolunteerSchedule({ token }: { token: string }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM-dd');
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [roleGroups, setRoleGroups] = useState<{ category: string; roles: string[] }[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('');
  const [requestRole, setRequestRole] = useState<VolunteerRole | null>(null);
  const [decisionBooking, setDecisionBooking] =
    useState<VolunteerBooking | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [message, setMessage] = useState('');

  const formatDate = (date: Date) =>
    formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    const dateStr = formatDate(currentDate);
    const reginaDate = toZonedTime(currentDate, reginaTimeZone);
    const weekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
    const holiday = holidays.some(h => h.date === dateStr);
    if (weekend || holiday) {
      setRoles([]);
      setBookings([]);
      setRoleGroups([]);
      setSelectedRoleKey('');
      return;
    }
    try {
      const [roleData, bookingData] = await Promise.all([
        getVolunteerRolesForVolunteer(token, dateStr),
        getMyVolunteerBookings(token),
      ]);
      setRoles(roleData);
      const groups = new Map<string, Set<string>>();
      roleData.forEach(r => {
        const set = groups.get(r.category_name) || new Set<string>();
        set.add(r.name);
        groups.set(r.category_name, set);
      });
      setRoleGroups(
        Array.from(groups.entries()).map(([category, set]) => ({
          category,
          roles: Array.from(set),
        }))
      );
      const keys = new Set(
        roleData.map(r => `${r.category_name}|${r.name}`)
      );
      setSelectedRoleKey(prev => (prev && keys.has(prev) ? prev : ''));
      const filtered = bookingData.filter(
        (b: VolunteerBooking) =>
          b.date === dateStr && ['approved', 'pending'].includes(b.status)
      );
      setBookings(filtered);
    } catch (err) {
      console.error(err);
    }
  }, [currentDate, token, holidays]);

  useEffect(() => {
    getHolidays(token).then(setHolidays).catch(() => {});
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function changeDay(delta: number) {
    setCurrentDate(d => new Date(d.getTime() + delta * 86400000));
  }

  async function submitRequest() {
    if (!requestRole) return;
    try {
      await requestVolunteerBooking(
        token,
        requestRole.id,
        formatDate(currentDate)
      );
      setRequestRole(null);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelSelected() {
    if (!decisionBooking) return;
    try {
      await updateVolunteerBookingStatus(
        token,
        decisionBooking.id,
        'cancelled'
      );
      await loadData();
    } catch {
      setMessage('Failed to cancel booking');
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
    }
  }

  async function rescheduleSelected() {
    if (!decisionBooking) return;
    const date = prompt('Enter new date (YYYY-MM-DD)');
    const role = prompt('Enter new role ID');
    if (!date || !role) return;
    try {
      await rescheduleVolunteerBookingByToken(
        decisionBooking.reschedule_token || '',
        Number(role),
        date,
      );
      await loadData();
    } catch {
      setMessage('Failed to reschedule booking');
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
    }
  }

  const dateStr = formatDate(currentDate);
  const reginaDate = toZonedTime(currentDate, reginaTimeZone);
  const dayName = formatInTimeZone(currentDate, reginaTimeZone, 'EEEE');
  const holidayObj = holidays.find(h => h.date === dateStr);
  const isHoliday = !!holidayObj;
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  const [selectedCategory, selectedName] = selectedRoleKey.split('|');
  const roleSlots = selectedRoleKey
    ? roles
        .filter(
          r =>
            r.category_name === selectedCategory && r.name === selectedName
        )
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    : [];
  const maxSlots = Math.max(0, ...roleSlots.map(r => r.max_volunteers));
  const rows = roleSlots.map(role => {
    const myBooking = bookings.find(b => b.role_id === role.id);
    const othersBooked = Math.max(0, role.booked - (myBooking ? 1 : 0));
    const cells: {
      content: string;
      backgroundColor?: string;
      onClick?: () => void;
    }[] = [];
    if (myBooking) {
      cells.push({
        content: 'My Booking',
        backgroundColor:
          myBooking.status === 'pending' ? '#ffe5b4' : '#e0f7e0',
        onClick: () => {
          setDecisionBooking(myBooking);
          setDecisionReason('');
        },
      });
    }
    for (let i = cells.length; i < role.max_volunteers; i++) {
      if (i - (myBooking ? 1 : 0) < othersBooked) {
        cells.push({ content: 'Booked', backgroundColor: '#f5f5f5' });
      } else {
        cells.push({
          content: 'Available',
          onClick: () => {
            if (!isClosed) {
              setRequestRole(role);
              setMessage('');
            } else {
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
            <ListSubheader key={`${g.category}-header`}>
              {g.category}
            </ListSubheader>,
            ...g.roles.map(r => (
              <MenuItem
                key={`${g.category}-${r}`}
                value={`${g.category}|${r}`}
              >
                {r}
              </MenuItem>
            )),
          ])}
        </Select>
      </FormControl>
      {selectedRoleKey && (
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
          <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="error" />
          {isClosed ? (
            <Typography align="center">
              Moose Jaw food bank is closed for {dayName}
            </Typography>
          ) : (
            <VolunteerScheduleTable maxSlots={maxSlots} rows={rows} />
          )}
        </>
      )}

      <Dialog open={!!requestRole} onClose={() => setRequestRole(null)}>
        <DialogTitle>Request Booking</DialogTitle>
        <DialogContent dividers>
          <Typography>Request booking for {requestRole?.name}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={submitRequest} variant="outlined" color="primary">Submit</Button>
          <Button onClick={() => setRequestRole(null)} variant="outlined" color="primary">Cancel</Button>
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
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={rescheduleSelected} variant="outlined" color="primary">Reschedule</Button>
          <Button onClick={cancelSelected} variant="outlined" color="primary">Cancel Booking</Button>
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
    </Box>
  );
}

