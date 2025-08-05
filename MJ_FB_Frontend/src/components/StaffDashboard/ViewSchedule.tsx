import { useState, useEffect, useCallback } from 'react';
import { getSlots, getBookings, getHolidays, searchUsers, createBookingForUser, decideBooking } from '../../api/api';
import type { Slot } from '../../types';

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

export default function ViewSchedule({ token }: { token: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [decisionBooking, setDecisionBooking] = useState<Booking | null>(null);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    const dateStr = formatDate(currentDate);
    const weekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const holiday = holidays.includes(dateStr);
    if (weekend || holiday) {
      setSlots([]);
      setBookings([]);
      return;
    }
    try {
      const [slotsData, bookingsData] = await Promise.all([
        getSlots(token, dateStr),
        getBookings(token),
      ]);
      setSlots(slotsData);
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
  const dayName = currentDate.toLocaleDateString(undefined, { weekday: 'long' });
  const isHoliday = holidays.includes(dateStr);
  const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  // prepare slots with lunch break
  const displaySlots: (Slot | { id: string; startTime: string; endTime: string; lunch: true })[] = [];
  const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  let lunchInserted = false;
  for (const s of sortedSlots) {
    if (!lunchInserted && s.startTime >= '13:00') {
      displaySlots.push({ id: 'lunch', startTime: '12:00', endTime: '13:00', lunch: true });
      lunchInserted = true;
    }
    displaySlots.push(s);
  }
  if (!lunchInserted) {
    displaySlots.push({ id: 'lunch', startTime: '12:00', endTime: '13:00', lunch: true });
  }

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
              if ('lunch' in slot) {
                return (
                  <tr key={idx} style={{ backgroundColor: '#f5f5f5' }}>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>12:00 - 13:00</td>
                    <td colSpan={4} style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>Lunch Break</td>
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

