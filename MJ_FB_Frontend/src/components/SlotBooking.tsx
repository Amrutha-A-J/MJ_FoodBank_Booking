import { useEffect, useState, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { searchUsers, createBookingForUser, createBooking, getSlots, getHolidays } from '../api/api';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { Slot, Holiday } from '../types';
import { formatTime } from '../utils/time';
import FeedbackSnackbar from './FeedbackSnackbar';
import { TextField, Button } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [dayMessage, setDayMessage] = useState('');
  const [bookingsThisMonth, setBookingsThisMonth] = useState<number>(() => {
    const currentMonth = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM');
    const storedMonth = localStorage.getItem('bookingsMonth');
    const storedCount = localStorage.getItem('bookingsThisMonth');
    if (storedMonth !== currentMonth) {
      localStorage.setItem('bookingsMonth', currentMonth);
      localStorage.setItem('bookingsThisMonth', '0');
      return 0;
    }
    return Number(storedCount || '0');
  });
  const [isLastWeek, setIsLastWeek] = useState(false);

  const loggedInName = localStorage.getItem('name') || 'You';

  const formatDate = (date: Date) => formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

  const isWeekend = useCallback((date: Date) => {
    const day = toZonedTime(date, reginaTimeZone).getDay();
    return day === 0 || day === 6;
  }, []);

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['holidays', token],
    queryFn: () => getHolidays(token),
  });

  const isHoliday = useCallback(
    (date: Date) => {
      const dateStr = formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');
      return holidays.some(h => h.date === dateStr);
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
    const today = toReginaDate(new Date());
    const zonedToday = toZonedTime(today, reginaTimeZone);
    const lastDay = new Date(zonedToday.getFullYear(), zonedToday.getMonth() + 1, 0);
    setIsLastWeek(lastDay.getDate() - zonedToday.getDate() < 7);
  }, []);

  // Automatically choose the first available date (non-weekend and non-holiday)
  useEffect(() => {
    if (selectedDate === null) {
      const today = toReginaDate(new Date());
      let date = today;
      if (isWeekend(date) || isHoliday(date)) {
        date = getNextAvailableDate(date);
      }
      setSelectedDate(date);
    }
  }, [selectedDate, holidays, isWeekend, isHoliday, getNextAvailableDate]);

  const { data: userResults = [] } = useQuery({
    queryKey: ['userSearch', searchTerm],
    queryFn: () => searchUsers(token, searchTerm),
    enabled: role === 'staff' && searchTerm.length >= 3,
    onError: (err: unknown) => setMessage(err instanceof Error ? err.message : 'Search failed'),
  });

  useEffect(() => {
    if (selectedDate) {
      const dayName = formatInTimeZone(selectedDate, reginaTimeZone, 'EEEE');
      if (isWeekend(selectedDate)) {
        setSelectedSlotId(null);
        setDayMessage(`Moose Jaw food bank is closed for ${dayName}`);
        setMessage('');
        return;
      }
      if (isHoliday(selectedDate)) {
        setSelectedSlotId(null);
        const next = getNextAvailableDate(selectedDate);
        setDayMessage(
          `This day is marked as a holiday by staff, next availability is ${formatDate(next)}`,
        );
        setMessage('');
        return;
      }
      setSelectedSlotId(null);
      setDayMessage('');
      setMessage('');
    }
  }, [selectedDate, isWeekend, isHoliday, getNextAvailableDate]);

  const slotsEnabled = !!selectedDate && !isWeekend(selectedDate) && !isHoliday(selectedDate);
  const { data: slots = [] } = useQuery<Slot[]>({
    queryKey: ['slots', token, selectedDate ? formatDate(selectedDate) : null],
    queryFn: () => getSlots(token, formatDate(selectedDate as Date)),
    enabled: slotsEnabled,
    onError: (err: unknown) => setMessage(err instanceof Error ? err.message : 'Failed to load slots'),
  });

  const queryClient = useQueryClient();
  const bookingMutation = useMutation((vars: { slotId: string; date: string }) =>
    createBooking(token, vars.slotId, vars.date),
  );
  const staffBookingMutation = useMutation((vars: { userId: number; slotId: number; date: string }) =>
    createBookingForUser(token, vars.userId, vars.slotId, vars.date, true),
  );

  async function submitBooking() {
    if (!selectedSlotId || !selectedDate) {
      setMessage('Please select a date and time slot');
      return;
    }

    try {
      const dateStr = formatDate(selectedDate);
      if (role === 'staff') {
        if (!selectedUser) {
          setMessage('Please select a user');
          return;
        }
        await staffBookingMutation.mutateAsync({
          userId: selectedUser.id,
          slotId: parseInt(selectedSlotId),
          date: dateStr,
        });
        setMessage('Booking created successfully!');
        setSelectedUser(null);
      } else {
        const res = await bookingMutation.mutateAsync({ slotId: selectedSlotId, date: dateStr });
        setMessage('Booking submitted!');
        if (res.bookingsThisMonth !== undefined) {
          setBookingsThisMonth(res.bookingsThisMonth);
          localStorage.setItem('bookingsThisMonth', res.bookingsThisMonth.toString());
          const currentMonth = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM');
          localStorage.setItem('bookingsMonth', currentMonth);
        }
      }
      setSelectedDate(null);
      setSelectedSlotId(null);
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already.*(twice|2)/i.test(msg)) {
        const currentMonth = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM');
        setBookingsThisMonth(2);
        localStorage.setItem('bookingsThisMonth', '2');
        localStorage.setItem('bookingsMonth', currentMonth);
      }
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
        <TextField
          placeholder="Search users by name/email/phone/client ID"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <ul className="user-results">
          {userResults.slice(0, 5).map(user => (
            <li key={user.id} className="user-item">
              {user.name} ({user.email})
              <Button size="small" variant="outlined" color="primary" sx={{ ml: 1 }} onClick={() => setSelectedUser(user)}>
                Book Appointment
              </Button>
            </li>
          ))}
        </ul>
        <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity="error" />
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
                {slots.map(s => (
                  <li
                    key={s.id}
                    onClick={() => {
                      if ((s.available ?? 0) > 0) {
                        setSelectedSlotId(s.id);
                      }
                    }}
                    className={`slot-item ${selectedSlotId === s.id ? 'selected' : ''} ${
                      (s.available ?? 0) > 0 ? '' : 'disabled'
                    }`}
                  >
                    <span>
                      {formatTime(s.startTime)} - {formatTime(s.endTime)}
                    </span>
                    <span>Available: {s.available ?? 0}</span>
                  </li>
                ))}
              </ul>
              <Button disabled={!selectedSlotId} onClick={submitBooking} variant="outlined" color="primary">
                {role === 'staff' ? 'Submit Booking' : 'Book Selected Slot'}
              </Button>
            </>
          )}
        </div>
      )}

      {role === 'staff' && (
        <Button onClick={() => setSelectedUser(null)} variant="outlined" color="primary">
          Back to Search
        </Button>
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={message.startsWith('Booking') ? 'success' : 'error'}
      />
    </div>
  );
}

