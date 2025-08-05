import { useEffect, useState, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { searchUsers, createBookingForUser, createBooking, getSlots, getHolidays } from '../api/api';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { Slot } from '../types';

const reginaTimeZone = 'America/Regina';
const LIMIT_MESSAGE =
  "You’ve already visited the Moose Jaw Food Bank twice this month. Please return at the end of the month to book your appointment for next month. You can only book for next month during the last week of this month.";

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

function toReginaDate(date: Date): Date {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return fromZonedTime(`${y}-${m}-${d}T00:00:00`, reginaTimeZone);
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
  const [bookingsThisMonth, setBookingsThisMonth] = useState<number>(
    Number(localStorage.getItem('bookingsThisMonth') || '0')
  );
  const [isLastWeek, setIsLastWeek] = useState(false);

  const loggedInName = localStorage.getItem('name') || 'You';

  const formatDate = (date: Date) => formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

  const isWeekend = useCallback((date: Date) => {
    const day = toZonedTime(date, reginaTimeZone).getDay();
    return day === 0 || day === 6;
  }, []);

  const isHoliday = useCallback(
    (date: Date) => {
      const dateStr = formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');
      return holidays.includes(dateStr);
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
    const today = toReginaDate(new Date());
    const zonedToday = toZonedTime(today, reginaTimeZone);
    const lastDay = new Date(zonedToday.getFullYear(), zonedToday.getMonth() + 1, 0);
    setIsLastWeek(lastDay.getDate() - zonedToday.getDate() < 7);
  }, []);

  // Automatically choose the first available date (non-weekend and non-holiday)
  useEffect(() => {
    const today = toReginaDate(new Date());
    let date = today;
    if (isWeekend(date) || isHoliday(date)) {
      date = getNextAvailableDate(date);
    }
    setSelectedDate(date);
  }, [holidays, isWeekend, isHoliday, getNextAvailableDate]);

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
      const dayName = formatInTimeZone(selectedDate, reginaTimeZone, 'EEEE');
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
        const res = await createBooking(token, selectedSlotId, formatDate(selectedDate));
        setMessage('Booking submitted!');
        if (res.bookingsThisMonth !== undefined) {
          setBookingsThisMonth(res.bookingsThisMonth);
          localStorage.setItem('bookingsThisMonth', res.bookingsThisMonth.toString());
        }
      }
      setSelectedDate(null);
      setSelectedSlotId(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage('Booking failed: ' + msg);
    }
  }

  if (role === 'shopper' && bookingsThisMonth >= 2 && !isLastWeek) {
    return (
      <div className="slot-booking">
        <h3>Booking for: {loggedInName}</h3>
        <p className="error-message">{LIMIT_MESSAGE}</p>
      </div>
    );
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
        onChange={value => {
          if (value instanceof Date) setSelectedDate(toReginaDate(value));
        }}
        value={selectedDate ? toZonedTime(selectedDate, reginaTimeZone) : undefined}
        calendarType="gregory"
        tileDisabled={({ date }) => {
          const regDate = toReginaDate(date);
          const today = toReginaDate(new Date());
          const regDateZ = toZonedTime(regDate, reginaTimeZone);
          const todayZ = toZonedTime(today, reginaTimeZone);
          const isPast = regDate < today;
          const sameMonth =
            regDateZ.getFullYear() === todayZ.getFullYear() && regDateZ.getMonth() === todayZ.getMonth();
          const nextMonth =
            regDateZ.getFullYear() ===
              (todayZ.getMonth() === 11 ? todayZ.getFullYear() + 1 : todayZ.getFullYear()) &&
            regDateZ.getMonth() === ((todayZ.getMonth() + 1) % 12);
          const outOfRange = !sameMonth && !(nextMonth && isLastWeek);
          return isPast || outOfRange || isHoliday(regDate);
        }}
        tileClassName={({ date }) => (isHoliday(toReginaDate(date)) ? 'holiday-tile' : undefined)}
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

