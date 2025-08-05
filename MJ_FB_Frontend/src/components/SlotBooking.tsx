import { useEffect, useState, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { searchUsers, createBookingForUser, createBooking, getSlots, getHolidays } from '../api/api';
import { toZonedTime } from 'date-fns-tz';
import type { Slot } from '../types';

const reginaTimeZone = 'America/Regina';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

interface Props {
  token: string;
  role: 'staff' | 'shopper';
}

export default function SlotBooking({ token, role }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [dayMessage, setDayMessage] = useState('');

  const loggedInName = localStorage.getItem('name') || 'You';

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const isWeekend = useCallback((date: Date) => {
    const day = toZonedTime(date, reginaTimeZone).getDay();
    return day === 0 || day === 6;
  }, []);

  const isHoliday = useCallback(
    (date: Date) => {
      const zoned = toZonedTime(date, reginaTimeZone);
      return holidays.includes(formatDate(zoned));
    },
    [holidays],
  );

  const getNextAvailableDate = useCallback(
    (date: Date) => {
      const next = new Date(date);
      do {
        next.setDate(next.getDate() + 1);
      } while (isWeekend(next) || isHoliday(next));
      return next;
    },
    [isWeekend, isHoliday],
  );

  useEffect(() => {
    getHolidays(token).then(setHolidays).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (role === 'staff') {
      const delayDebounce = setTimeout(() => {
        if (searchTerm.length >= 3) {
          searchUsers(token, searchTerm)
            .then((data: User[]) => setUserResults(data.slice(0, 5)))
            .catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Search failed'));
        } else {
          setUserResults([]);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchTerm, token, role]);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate);
      const dayName = toZonedTime(selectedDate, reginaTimeZone).toLocaleDateString('en-US', {
        weekday: 'long',
      });
      if (isWeekend(selectedDate)) {
        setSlots([]);
        setSelectedSlotId(null);
        setDayMessage(`Moose Jaw food bank is closed for ${dayName}`);
        setMessage('');
        return;
      }
      if (isHoliday(selectedDate)) {
        setSlots([]);
        setSelectedSlotId(null);
        const next = getNextAvailableDate(selectedDate);
        setDayMessage(
          `This day is marked as a holiday by staff, next availability is ${formatDate(next)}`,
        );
        setMessage('');
        return;
      }
      getSlots(token, dateStr)
        .then(setSlots)
        .catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Failed to load slots'));
      setSelectedSlotId(null);
      setDayMessage('');
      setMessage('');
    }
  }, [selectedDate, token, holidays, isWeekend, isHoliday, getNextAvailableDate]);

  async function submitBooking() {
    if (!selectedSlotId || !selectedDate) {
      setMessage('Please select a date and time slot');
      return;
    }

    try {
      if (role === 'staff') {
        if (!selectedUser) {
          setMessage('Please select a user');
          return;
        }
        await createBookingForUser(token, selectedUser.id, parseInt(selectedSlotId), formatDate(selectedDate), true);
        setMessage('Booking created successfully!');
        setSelectedUser(null);
      } else {
        await createBooking(token, selectedSlotId, formatDate(selectedDate));
        setMessage('Booking submitted!');
      }
      setSelectedDate(null);
      setSelectedSlotId(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage('Booking failed: ' + msg);
    }
  }

  if (role === 'staff' && !selectedUser) {
    return (
      <div>
        <input
          type="text"
          placeholder="Search users by name/email/phone/client ID"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <ul className="user-results">
          {userResults.map(user => (
            <li key={user.id} className="user-item">
              {user.name} ({user.email})
              <button onClick={() => setSelectedUser(user)}>Book Appointment</button>
            </li>
          ))}
        </ul>
        {message && <p className="error-message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="slot-booking">
      <h3>
        {role === 'staff' && selectedUser ? `Booking for: ${selectedUser.name}` : `Booking for: ${loggedInName}`}
      </h3>
      <Calendar
        onChange={(value) => {
          if (value instanceof Date) setSelectedDate(value);
        }}
        value={selectedDate}
        calendarType="gregory"
        tileDisabled={({ date }) => {
          const zoned = toZonedTime(date, reginaTimeZone);
          const today = toZonedTime(new Date(), reginaTimeZone);
          const isPast = zoned < new Date(today.toDateString());
          return isPast;
        }}
      />
      {selectedDate && (
        <div className="slot-day-container">
          {dayMessage ? (
            <div className="day-message">{dayMessage}</div>
          ) : (
            <>
              <h4>Available Slots on {formatDate(selectedDate)}</h4>
              <ul className="slot-list">
                {slots.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => s.available > 0 && setSelectedSlotId(s.id)}
                    className={`slot-item ${selectedSlotId === s.id ? 'selected' : ''} ${
                      s.available > 0 ? '' : 'disabled'
                    }`}
                  >
                    <span>{s.startTime} - {s.endTime}</span>
                    <span>Available: {s.available}</span>
                  </li>
                ))}
              </ul>
              <button disabled={!selectedSlotId} onClick={submitBooking}>
                {role === 'staff' ? 'Submit Booking' : 'Book Selected Slot'}
              </button>
            </>
          )}
        </div>
      )}

      {role === 'staff' && <button onClick={() => setSelectedUser(null)}>Back to Search</button>}
      {message && (
        <p className={message.startsWith('Booking') ? 'success-message' : 'error-message'}>{message}</p>
      )}
    </div>
  );
}

