import { useState, useEffect, useCallback } from 'react';
import { getSlots, getBookings, getHolidays, searchUsers, createBookingForUser, decideBooking, getBlockedSlots, getBreaks, getAllSlots } from '../../api/api';
import type { Slot, Break } from '../../types';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

interface Booking {
  id: number;
  status: string;
  date: string;
  slot_id: number;
  user_name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const reginaTimeZone = 'America/Regina';

export default function ViewSchedule({ token }: { token: string }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM-dd');
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<number[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [decisionBooking, setDecisionBooking] = useState<Booking | null>(null);

  const formatDate = (date: Date) => formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    const dateStr = formatDate(currentDate);
    const reginaDate = toZonedTime(currentDate, reginaTimeZone);
    const weekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
    const holiday = holidays.includes(dateStr);
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
      await decideBooking(token, decisionBooking.id.toString(), decision);
      await loadData();
    } catch {
      setMessage(`Failed to ${decision} booking`);
    } finally {
      setDecisionBooking(null);
    }
  }

  async function assignUser(user: User) {
    if (!assignSlot) return;
    try {
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
      setMessage('Failed to assign user');
    }
  }

  const dateStr = formatDate(currentDate);
  const reginaDate = toZonedTime(currentDate, reginaTimeZone);
  const dayName = formatInTimeZone(currentDate, reginaTimeZone, 'EEEE');
  const isHoliday = holidays.includes(dateStr);
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  const slotMap = new Map(allSlots.map(s => [s.id, s]));
  const dayBreaks = breaks.filter(b => b.dayOfWeek === reginaDate.getDay());
  const displaySlots: (
    Slot & { break?: boolean; blocked?: boolean }
  )[] = [];
  for (const b of dayBreaks) {
    const s = slotMap.get(b.slotId.toString());
    if (s) displaySlots.push({ ...s, available: 0, break: true });
  }
  for (const id of blockedSlots) {
    const s = slotMap.get(id.toString());
    if (s) displaySlots.push({ ...s, available: 0, blocked: true });
  }
  for (const s of slots) {
    displaySlots.push(s);
  }
  displaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => changeDay(-1)}>Previous</button>
        <h3>{dateStr} - {dayName}{isHoliday ? ' (Holiday)' : isWeekend ? ' (Weekend)' : ''}</h3>
        <button onClick={() => changeDay(1)}>Next</button>
      </div>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      {isClosed ? (
        <p style={{ textAlign: 'center' }}>Moose Jaw food bank is closed for {dayName}</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 8, width: '120px' }}>Time</th>
              {[1,2,3,4].map(i => (
                <th key={i} style={{ border: '1px solid #ccc', padding: 8 }}>Slot {i}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displaySlots.map((slot, idx) => {
              if (slot.break) {
                return (
                  <tr key={`break-${idx}`} style={{ backgroundColor: '#f5f5f5' }}>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{slot.startTime} - {slot.endTime}</td>
                    <td colSpan={4} style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>Break</td>
                  </tr>
                );
              }
              if (slot.blocked) {
                return (
                  <tr key={`blocked-${idx}`} style={{ backgroundColor: '#f5f5f5' }}>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{slot.startTime} - {slot.endTime}</td>
                    <td colSpan={4} style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>Blocked</td>
                  </tr>
                );
              }
              const slotBookings = bookings.filter(b => b.slot_id === parseInt(slot.id));
              return (
                <tr key={slot.id}>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{slot.startTime} - {slot.endTime}</td>
                  {Array.from({ length: 4 }).map((_, i) => {
                    const booking = slotBookings[i];
                    return (
                      <td
                        key={i}
                        style={{
                          border: '1px solid #ccc',
                          padding: 8,
                          height: 40,
                          cursor: booking
                            ? booking.status === 'submitted'
                              ? 'pointer'
                              : 'default'
                            : isClosed
                              ? 'not-allowed'
                              : 'pointer',
                          backgroundColor: booking
                            ? booking.status === 'submitted'
                              ? '#ffe5b4'
                              : '#e0f7e0'
                            : 'transparent',
                        }}
                        onClick={() => {
                          if (booking) {
                            if (booking.status === 'submitted') {
                              setDecisionBooking(booking);
                            }
                          } else if (!isClosed) {
                            setAssignSlot(slot);
                          } else {
                            setMessage('Booking not allowed on weekends or holidays');
                          }
                        }}
                      >
                        {booking ? booking.user_name : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
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
          <div style={{ background: 'white', padding: 16, borderRadius: 4, width: '300px' }}>
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
                  <button style={{ marginLeft: 4 }} onClick={() => assignUser(u)}>
                    Assign
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => { setAssignSlot(null); setSearchTerm(''); }}>Close</button>
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
          <div style={{ background: 'white', padding: 16, borderRadius: 4, width: '300px' }}>
            <h4>Decide Booking</h4>
            <p>Approve or reject booking for {decisionBooking.user_name}?</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button onClick={() => decideSelected('approve')}>Approve</button>
              <button onClick={() => decideSelected('reject')}>Reject</button>
              <button onClick={() => setDecisionBooking(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

