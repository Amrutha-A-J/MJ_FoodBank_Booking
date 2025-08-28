import { useState, useEffect, useCallback } from 'react';
import {
  getSlots,
  getBookings,
  getHolidays,
  createBookingForUser,
} from '../../api/bookings';
import { searchUsers } from '../../api/users';
import type { Slot, Holiday } from '../../types';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { formatTime } from '../../utils/time';
import { formatDate, addDays } from '../../utils/date';
import VolunteerScheduleTable from '../../components/VolunteerScheduleTable';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  Button,
  Link,
  type AlertColor,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { lighten } from '@mui/material/styles';
import RescheduleDialog from '../../components/RescheduleDialog';
import ManageBookingDialog from '../../components/ManageBookingDialog';
import Page from '../../components/Page';

interface Booking {
  id: number;
  status: string;
  date: string;
  slot_id: number;
  user_name: string;
  user_id: number;
  client_id: number;
  bookings_this_month: number;
  is_staff_booking: boolean;
  reschedule_token: string;
  profile_link: string;
}

interface User {
  id: number;
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

  const theme = useTheme();
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
      const filtered = bookingsData.filter((b: Booking) =>
        ['approved', 'no_show', 'visited'].includes(b.status),
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
    if (assignSlot && searchTerm.length >= 3) {
      const delay = setTimeout(() => {
        (searchUsersFn || searchUsers)(searchTerm)
          .then((data: User[]) => setUserResults(data.slice(0, 5)))
          .catch(() => setUserResults([]));
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setUserResults([]);
    }
  }, [searchTerm, assignSlot]);

  function changeDay(delta: number) {
    setCurrentDate(d => addDays(d, delta));
  }


  async function assignUser(user: User) {
    if (!assignSlot) return;
    try {
      setAssignMessage('');
      await createBookingForUser(
        user.id,
        parseInt(assignSlot.id),
        formatDate(currentDate),
        true
      );
      setAssignSlot(null);
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
            backgroundColor: '#f5f5f5',
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
            backgroundColor: '#f5f5f5',
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
          const text = `${booking.user_name} (${booking.client_id})`;
          if (overCapacity) {
            content = (
              <Tooltip title="Capacity exceeded">
                <span>{text}</span>
              </Tooltip>
            );
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
    <Page title="Pantry Schedule">
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
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
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
          <VolunteerScheduleTable maxSlots={maxSlots} rows={rows} />
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
            <input
              type="text"
              placeholder="Search users by name/email/phone/client ID"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <ul style={{ listStyle: 'none', paddingLeft: 0, maxHeight: '150px', overflowY: 'auto' }}>
              {userResults.map(u => (
                <li key={u.id} style={{ marginBottom: 4 }}>
                  {u.name} ({u.email})
                  <Button
                    style={{ marginLeft: 4 }}
                    onClick={() => assignUser(u)}
                    variant="outlined"
                    color="primary"
                  >
                    Assign
                  </Button>
                </li>
              ))}
              {assignSlot && searchTerm.length >= 3 && userResults.length === 0 && (
                <li>No search results.</li>
              )}
            </ul>
            <FeedbackSnackbar open={!!assignMessage} onClose={() => setAssignMessage('')} message={assignMessage} severity="error" />
            <Button onClick={() => { setAssignSlot(null); setSearchTerm(''); setAssignMessage(''); }} variant="outlined" color="primary">Close</Button>
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

