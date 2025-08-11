import { useState, useEffect, useCallback } from 'react';
import { getSlots, getBookings, getHolidays, searchUsers, createBookingForUser, decideBooking, cancelBooking, getBlockedSlots, getBreaks, getAllSlots } from '../../api/api';
import type { Slot, Break, Holiday, BlockedSlot } from '../../types';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { formatTime } from '../../utils/time';
import VolunteerScheduleTable from '../VolunteerScheduleTable';
import FeedbackSnackbar from '../FeedbackSnackbar';
import { Button } from '@mui/material';
import RescheduleDialog from '../RescheduleDialog';

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

export default function PantrySchedule({ token }: { token: string }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM-dd');
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [decisionBooking, setDecisionBooking] = useState<Booking | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [assignMessage, setAssignMessage] = useState('');
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);

  const formatDate = (date: Date) => formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

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
        getSlots(token, dateStr),
        getBookings(token),
        getBlockedSlots(token, dateStr),
      ]);
      setSlots(slotsData);
      setBlockedSlots(blockedData);
      const filtered = bookingsData.filter(
        (b: Booking) => b.date.split('T')[0] === dateStr && ['approved', 'submitted'].includes(b.status)
      );
      setBookings(filtered);
    } catch (err) {
      console.error(err);
    }
  }, [currentDate, token, holidays]);

  useEffect(() => {
    getHolidays(token).then(setHolidays).catch(() => {});
    getBreaks(token).then(setBreaks).catch(() => {});
    getAllSlots(token).then(setAllSlots).catch(() => {});
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (assignSlot && searchTerm.length >= 3) {
      const delay = setTimeout(() => {
        searchUsers(token, searchTerm)
          .then((data: User[]) => setUserResults(data.slice(0, 5)))
          .catch(() => setUserResults([]));
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setUserResults([]);
    }
  }, [searchTerm, token, assignSlot]);

  function changeDay(delta: number) {
    setCurrentDate(d => new Date(d.getTime() + delta * 86400000));
  }

  async function decideSelected(decision: 'approve' | 'reject') {
    if (!decisionBooking) return;
    try {
      await decideBooking(token, decisionBooking.id.toString(), decision, decisionReason);
      await loadData();
    } catch {
      setMessage(`Failed to ${decision} booking`);
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
    }
  }

  async function cancelSelected() {
    if (!decisionBooking) return;
    try {
      await cancelBooking(token, decisionBooking.id.toString(), decisionReason);
      await loadData();
    } catch {
      setMessage('Failed to cancel booking');
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
    }
  }

  function openReschedule() {
    if (!decisionBooking) return;
    setRescheduleBooking(decisionBooking);
    setDecisionBooking(null);
    setDecisionReason('');
  }

  async function assignUser(user: User) {
    if (!assignSlot) return;
    try {
      setAssignMessage('');
      await createBookingForUser(
        token,
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
  const dayName = formatInTimeZone(currentDate, reginaTimeZone, 'EEEE');
  const holidayObj = holidays.find(h => h.date === dateStr);
  const isHoliday = !!holidayObj;
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  const slotMap = new Map(allSlots.map(s => [s.id, s]));
  const dayBreaks = breaks.filter(b => b.dayOfWeek === reginaDate.getDay());
  const displaySlots: (Slot & { break?: boolean; blocked?: boolean; reason?: string })[] = [];
  for (const b of dayBreaks) {
    const s = slotMap.get(b.slotId.toString());
    if (s) displaySlots.push({ ...s, available: 0, break: true, reason: b.reason });
  }
  for (const b of blockedSlots) {
    const s = slotMap.get(b.slotId.toString());
    if (s) displaySlots.push({ ...s, available: 0, blocked: true, reason: b.reason });
  }
  for (const s of slots) {
    displaySlots.push(s);
  }
  displaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const rows = displaySlots.map(slot => {
    if (slot.break) {
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
    if (slot.blocked) {
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
              ? '#ffe5b4'
              : '#e0f7e0'
            : undefined,
          onClick: () => {
            if (booking) {
              if (['submitted', 'approved'].includes(booking.status)) {
                setDecisionBooking(booking);
                setDecisionReason('');
              }
            } else if (!isClosed) {
              setAssignSlot(slot);
              setAssignMessage('');
            } else {
              setMessage('Booking not allowed on weekends or holidays');
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
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="error" />
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
          <div style={{ background: 'white', padding: 16, borderRadius: 10, width: '320px' }}>
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
            <textarea
              placeholder={
                decisionBooking.status === 'submitted'
                  ? 'Reason for rejection'
                  : 'Reason for cancellation'
              }
              value={decisionReason}
              onChange={e => setDecisionReason(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              {decisionBooking.status === 'submitted' ? (
                <>
                  <Button onClick={openReschedule} variant="outlined" color="primary">Reschedule</Button>
                  <Button onClick={() => decideSelected('approve')} variant="outlined" color="primary">Approve</Button>
                  <Button onClick={() => decideSelected('reject')} variant="outlined" color="primary">Reject</Button>
                  <Button
                    onClick={() => {
                      setDecisionBooking(null);
                      setDecisionReason('');
                    }}
                    variant="outlined"
                    color="primary"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={openReschedule} variant="outlined" color="primary">Reschedule</Button>
                  <Button onClick={cancelSelected} variant="outlined" color="primary">Confirm</Button>
                  <Button
                    onClick={() => {
                      setDecisionBooking(null);
                      setDecisionReason('');
                    }}
                    variant="outlined"
                    color="primary"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {rescheduleBooking && (
        <RescheduleDialog
          open={!!rescheduleBooking}
          token={token}
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

