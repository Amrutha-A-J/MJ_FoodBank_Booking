import { useState, useEffect, useCallback } from 'react';
import {
  getSlots,
  getBookings,
  getHolidays,
  createBookingForUser,
  createBookingForNewClient,
} from '../../api/bookings';
import { searchUsers } from '../../api/users';
import type { Slot, Holiday, Booking } from '../../types';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { formatTime } from '../../utils/time';
import { formatDate, addDays } from '../../utils/date';
import VolunteerScheduleTable from '../../components/VolunteerScheduleTable';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  Button,
  type AlertColor,
  useTheme,
  Checkbox,
  FormControlLabel,
  TextField,
} from '@mui/material';
import ManageBookingDialog from '../../components/ManageBookingDialog';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import Page from '../../components/Page';

interface User {
  client_id: number;
  name: string;
  email: string;
}

const reginaTimeZone = 'America/Regina';

export default function PantrySchedule({
  clientIds,
  searchUsersFn,
}: {
  clientIds?: number[];
  searchUsersFn?: (search: string) => Promise<User[]>;
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatDate();
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: AlertColor } | null>(null);
  const [manageBooking, setManageBooking] = useState<Booking | null>(null);
  const [assignMessage, setAssignMessage] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });

  const theme = useTheme();
  const neutralCellBg = theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200];
  const statusColors: Record<string, string> = {
    approved: 'rgb(228,241,228)',
    no_show: 'rgb(255, 200, 200)',
    visited: 'rgb(111,146,113)',
  };

  const loadData = useCallback(async () => {
    const dateStr = formatDate(currentDate);
    const reginaDate = toZonedTime(currentDate, reginaTimeZone);
    const weekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
    const holiday = holidays.some(h => h.date === dateStr);
    if (weekend || holiday) {
      setSlots([]);
      setBookings([]);
      return;
    }
    try {
      const [slotsData, bookingsData] = await Promise.all([
        getSlots(dateStr, true),
        getBookings({ date: dateStr, clientIds }),
      ]);
      setSlots(slotsData);
      const bookingsArray = Array.isArray(bookingsData)
        ? bookingsData
        : [bookingsData];
      const filtered = bookingsArray.filter(
        (b: Booking) => b.status.toLowerCase() !== 'cancelled',
      );
      setBookings(filtered);
    } catch (err) {
      console.error(err);
    }
  }, [currentDate, holidays, clientIds]);

  useEffect(() => {
    getHolidays().then(setHolidays).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (formatDate(currentDate) !== formatDate()) return;
    const reloadIfVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    const interval = setInterval(reloadIfVisible, 60_000);
    document.addEventListener('visibilitychange', reloadIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', reloadIfVisible);
    };
  }, [currentDate, loadData]);

  useEffect(() => {
    if (assignSlot && !isNewClient && searchTerm.length >= 3) {
      const delay = setTimeout(() => {
        (searchUsersFn || searchUsers)(searchTerm)
          .then((data: User[]) => setUserResults(data.slice(0, 5)))
          .catch(() => setUserResults([]));
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setUserResults([]);
    }
  }, [searchTerm, assignSlot, isNewClient]);

  function changeDay(delta: number) {
    setCurrentDate(d => addDays(d, delta));
  }


  async function assignExistingUser(user: User) {
    if (!assignSlot) return;
    try {
      setAssignMessage('');
      await createBookingForUser(
        user.client_id,
        parseInt(assignSlot.id),
        formatDate(currentDate),
        true
      );
      setAssignSlot(null);
      setSearchTerm('');
      setIsNewClient(false);
      setNewClient({ name: '', email: '', phone: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to assign user';
      setAssignMessage(msg);
    }
  }

  async function assignNewClient() {
    if (!assignSlot) return;
    try {
      setAssignMessage('');
      await createBookingForNewClient(
        newClient.name,
        parseInt(assignSlot.id),
        formatDate(currentDate),
        newClient.email || undefined,
        newClient.phone || undefined,
      );
      setAssignSlot(null);
      setIsNewClient(false);
      setNewClient({ name: '', email: '', phone: '' });
      setSearchTerm('');
      await loadData();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to assign user';
      setAssignMessage(msg);
    }
  }

  const dateStr = formatDate(currentDate);
  const reginaDate = toZonedTime(currentDate, reginaTimeZone);
  const dayName = formatDate(currentDate, 'dddd');
  const holidayObj = holidays.find(h => h.date === dateStr);
  const isHoliday = !!holidayObj;
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  const maxSlots = Math.max(
    0,
    ...slots.map(s => {
      const bookingCount = bookings.filter(
        b => b.slot_id === parseInt(s.id),
      ).length;
      return Math.max(s.maxCapacity ?? 0, bookingCount);
    }),
  );

  const displaySlots: Slot[] = [...slots];
  if (
    !isClosed &&
    !displaySlots.some(
      s => s.startTime === '12:00:00' || s.startTime === '12:30:00',
    )
  ) {
    displaySlots.push({
      id: 'lunch-break',
      startTime: '12:00:00',
      endTime: '13:00:00',
      status: 'break',
      reason: 'Lunch',
    });
  }
  displaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const rows = displaySlots.map(slot => {
    if (slot.status === 'break') {
      return {
        time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
        cells: [
          {
            content: `Break${slot.reason ? ` - ${slot.reason}` : ''}`,
            colSpan: maxSlots,
            backgroundColor: neutralCellBg,
          },
        ],
      };
    }
    if (slot.status === 'blocked') {
      return {
        time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
        cells: [
          {
            content: `Blocked${slot.reason ? ` - ${slot.reason}` : ''}`,
            colSpan: maxSlots,
            backgroundColor: neutralCellBg,
          },
        ],
      };
    }
    const slotBookings = bookings.filter(b => b.slot_id === parseInt(slot.id));
    return {
      time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
      cells: Array.from({ length: maxSlots }).map((_, i) => {
        const booking = slotBookings[i];
        const withinCapacity = i < (slot.maxCapacity ?? 0);
        const overCapacity = !!booking && !withinCapacity;
        let content;
        let onClick;
        let backgroundColor: string | undefined;
        if (booking) {
          const isNew = booking.newClientId || booking.client_id === null;
          const text = isNew
            ? `[NEW CLIENT] ${booking.user_name}`
            : `${booking.user_name} (${booking.client_id})`;
          if (overCapacity) {
            content = <span>{text}</span>;
            backgroundColor = theme.palette.warning.light;
          } else {
            content = text;
            backgroundColor = statusColors[booking.status];
          }
          if (booking.status === 'approved') {
            onClick = () => setManageBooking(booking);
          }
        } else if (withinCapacity && !isClosed) {
          content = '';
          onClick = () => {
            setAssignSlot(slot);
            setAssignMessage('');
          };
        } else if (!withinCapacity) {
          content = (
            <span style={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
              Over capacity
            </span>
          );
        } else {
          content = '';
        }
        return {
          content,
          backgroundColor,
          onClick,
        };
      }),
    };
  });

  return (
    <Page title="Pantry Schedule" header={<PantryQuickLinks />}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button onClick={() => changeDay(-1)} variant="outlined" color="primary">Previous</Button>
        <h3>
          {dateStr} - {dayName}
          {isHoliday
            ? ` (Holiday${holidayObj?.reason ? ': ' + holidayObj.reason : ''})`
            : isWeekend
              ? ' (Weekend)'
              : ''}
        </h3>
        <Button onClick={() => changeDay(1)} variant="outlined" color="primary">Next</Button>
      </div>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
      {isClosed ? (
        <p style={{ textAlign: 'center' }}>Moose Jaw food bank is closed for {dayName}</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            {[
              { label: 'Approved', color: statusColors.approved },
              { label: 'No Show', color: statusColors.no_show },
              { label: 'Visited', color: statusColors.visited },
              { label: 'Capacity Exceeded', color: theme.palette.warning.light },
            ].map(item => (
              <span
                key={item.label}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: item.color,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                  }}
                />
                {item.label}
              </span>
            ))}
          </div>
          <VolunteerScheduleTable
            maxSlots={maxSlots}
            rows={rows}
          />
        </>
      )}

      {assignSlot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: 'white', padding: 16, borderRadius: 10, width: '300px' }}>
            <h4>Assign User</h4>
            <FormControlLabel
              control={<Checkbox checked={isNewClient} onChange={e => setIsNewClient(e.target.checked)} />}
              label={
                <>
                  New client
                </>
              }
            />
            {isNewClient ? (
              <>
                <TextField
                  label="Name"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  fullWidth
                  margin="dense"
                />
                <TextField
                  label="Email (optional)"
                  value={newClient.email}
                  onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                  fullWidth
                  margin="dense"
                />
                <TextField
                  label="Phone (optional)"
                  value={newClient.phone}
                  onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                  fullWidth
                  margin="dense"
                />
                <Button
                  sx={{ mt: 1 }}
                  onClick={assignNewClient}
                  variant="contained"
                  size="small"
                  disabled={!newClient.name}
                >
                  Assign
                </Button>
              </>
            ) : (
              <>
                <TextField
                  label="Search users by name/email/phone/client ID"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  fullWidth
                  margin="dense"
                />
                <ul style={{ listStyle: 'none', paddingLeft: 0, maxHeight: '150px', overflowY: 'auto' }}>
                  {userResults.map(u => (
                    <li key={u.client_id} style={{ marginBottom: 4 }}>
                      {u.name} ({u.email})
                      <Button
                        style={{ marginLeft: 4 }}
                        onClick={() => assignExistingUser(u)}
                        variant="outlined"
                        color="primary"
                        size="small"
                      >
                        Assign
                      </Button>
                    </li>
                  ))}
                  {assignSlot && searchTerm.length >= 3 && userResults.length === 0 && (
                    <li>
                      No search results.
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setIsNewClient(true)}
                        sx={{ ml: 1 }}
                      >
                        Create new client
                      </Button>
                    </li>
                  )}
                </ul>
              </>
            )}
            <FeedbackSnackbar open={!!assignMessage} onClose={() => setAssignMessage('')} message={assignMessage} severity="error" />
            <Button
              onClick={() => {
                setAssignSlot(null);
                setSearchTerm('');
                setAssignMessage('');
                setIsNewClient(false);
                setNewClient({ name: '', email: '', phone: '' });
              }}
              variant="outlined"
              color="primary"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {manageBooking && (
        <ManageBookingDialog
          open={!!manageBooking}
          booking={manageBooking}
          onClose={() => setManageBooking(null)}
          onUpdated={(message, severity) => {
            setSnackbar({ message, severity });
            loadData();
          }}
        />
      )}
    </Page>
  );
}

