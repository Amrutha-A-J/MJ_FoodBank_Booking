import { useState, useEffect, useCallback } from 'react';
import { getSlots, getBookings, getHolidays, createBookingForUser, decideBooking, cancelBooking, getBlockedSlots, getAllSlots } from '../../api/bookings';
import { searchUsers } from '../../api/users';
import type { Slot, Holiday, BlockedSlot } from '../../types';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { formatTime } from '../../utils/time';
import { formatDate, addDays } from '../../utils/date';
import VolunteerScheduleTable from '../../components/VolunteerScheduleTable';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { Button, type AlertColor, useTheme, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { lighten } from '@mui/material/styles';
import RescheduleDialog from '../../components/RescheduleDialog';

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
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: AlertColor } | null>(null);
  const [decisionBooking, setDecisionBooking] = useState<Booking | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);

  const theme = useTheme();
  const approvedColor = lighten(theme.palette.success.light, 0.4);

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
      const [slotsData, bookingsData, blockedData] = await Promise.all([
        getSlots(dateStr),
        getBookings({ date: dateStr, clientIds }),
        getBlockedSlots(dateStr),
      ]);
      setSlots(slotsData);
      setBlockedSlots(blockedData);
      const filtered = bookingsData.filter((b: Booking) =>
        ['approved', 'submitted'].includes(b.status),
      );
      setBookings(filtered);
    } catch (err) {
      console.error(err);
    }
  }, [currentDate, holidays, clientIds]);

  useEffect(() => {
    getHolidays().then(setHolidays).catch(() => {});
    getAllSlots().then(setAllSlots).catch(() => {});
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

  async function decideSelected(decision: 'approve' | 'reject') {
    if (!decisionBooking) return;
    if (decision === 'reject' && !decisionReason.trim()) {
      setSnackbar({ message: 'Reason for rejection required', severity: 'error' });
      return;
    }
    try {
      await decideBooking(decisionBooking.id.toString(), decision, decisionReason);
      await loadData();
      setSnackbar({ message: `Booking ${decision}d`, severity: 'success' });
    } catch {
      setSnackbar({ message: `Failed to ${decision} booking`, severity: 'error' });
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
      setShowRejectReason(false);
    }
  }

  async function cancelSelected() {
    if (!decisionBooking) return;
    try {
      await cancelBooking(decisionBooking.id.toString(), decisionReason);
      await loadData();
      setSnackbar({ message: 'Booking cancelled', severity: 'success' });
    } catch {
      setSnackbar({ message: 'Failed to cancel booking', severity: 'error' });
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
      setShowRejectReason(false);
    }
  }

  function openReschedule() {
    if (!decisionBooking) return;
    setRescheduleBooking(decisionBooking);
    setDecisionBooking(null);
    setDecisionReason('');
    setShowRejectReason(false);
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

  const slotMap = new Map(allSlots.map(s => [s.id, s]));
  const displaySlots: Slot[] = [];
  for (const b of blockedSlots) {
    const s = slotMap.get(b.slotId.toString());
    if (s)
      displaySlots.push({
        ...s,
        available: 0,
        status: b.status ?? 'blocked',
        reason: b.reason,
      });
  }
  for (const s of slots) {
    displaySlots.push(s);
  }
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
            colSpan: 4,
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
            colSpan: 4,
            backgroundColor: '#f5f5f5',
          },
        ],
      };
    }
    const slotBookings = bookings.filter(b => b.slot_id === parseInt(slot.id));
    return {
      time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
      cells: Array.from({ length: 4 }).map((_, i) => {
        const booking = slotBookings[i];
        return {
          content: booking ? booking.user_name : '',
          backgroundColor: booking
            ? booking.status === 'submitted'
              ? theme.palette.warning.light
              : approvedColor
            : undefined,
          onClick: () => {
            if (booking) {
              if (['submitted', 'approved'].includes(booking.status)) {
                setDecisionBooking(booking);
                setDecisionReason('');
                setShowRejectReason(false);
              }
            } else if (!isClosed) {
              setAssignSlot(slot);
              setAssignMessage('');
            } else {
              setSnackbar({ message: 'Booking not allowed on weekends or holidays', severity: 'error' });
            }
          },
        };
      }),
    };
  });

  return (
    <div>
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
        <VolunteerScheduleTable maxSlots={4} rows={rows} />
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

      {decisionBooking && (
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
          <div style={{ background: 'white', padding: 16, borderRadius: 10, width: '320px', position: 'relative' }}>
            <IconButton
              aria-label="close"
              size="small"
              onClick={() => {
                setDecisionBooking(null);
                setDecisionReason('');
                setShowRejectReason(false);
              }}
              sx={{ position: 'absolute', top: 4, right: 4 }}
            >
              <CloseIcon />
            </IconButton>
            <h4>Manage Booking</h4>
            <p>
              {decisionBooking.status === 'submitted'
                ? `Approve or reject booking for ${decisionBooking.user_name}?`
                : `Cancel booking for ${decisionBooking.user_name}?`}
            </p>
            <p>
              Client ID: {decisionBooking.client_id}<br />
              Uses This Month: {decisionBooking.bookings_this_month}
            </p>
            {decisionBooking.status === 'submitted' && showRejectReason && (
              <textarea
                placeholder="Reason for rejection"
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                style={{ width: '100%', marginTop: 8 }}
              />
            )}
            {decisionBooking.status !== 'submitted' && (
              <textarea
                placeholder="Reason for cancellation"
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                style={{ width: '100%', marginTop: 8 }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              {decisionBooking.status === 'submitted' ? (
                <>
                  <Button onClick={() => decideSelected('approve')} variant="outlined" color="primary">Approve</Button>
                  <Button
                    onClick={() => {
                      if (!showRejectReason) {
                        setShowRejectReason(true);
                      } else {
                        decideSelected('reject');
                      }
                    }}
                    variant="outlined"
                    color="primary"
                    disabled={showRejectReason && !decisionReason.trim()}
                  >
                    {showRejectReason ? 'Confirm Reject' : 'Reject'}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={openReschedule} variant="outlined" color="primary">Reschedule</Button>
                  <Button onClick={cancelSelected} variant="outlined" color="primary">Confirm</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {rescheduleBooking && (
        <RescheduleDialog
          open={!!rescheduleBooking}
          rescheduleToken={rescheduleBooking.reschedule_token}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}

