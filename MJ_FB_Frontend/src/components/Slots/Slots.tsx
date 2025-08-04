import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getSlots, createBooking, getHolidays } from '../../api/api';
import './Slots.css';
import { toZonedTime } from 'date-fns-tz';

const reginaTimeZone = 'America/Regina';

export default function Slots({
  token,
  setError,
  setLoading,
}: {
  token: string;
  setError?: (msg: string) => void;
  setLoading?: (state: boolean) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const reginaToday = toZonedTime(today, reginaTimeZone);
    const day = reginaToday.getDay(); // 0=Sun, 6=Sat

    // if today is weekend, select next Monday
    if (day === 0) reginaToday.setDate(reginaToday.getDate() + 1);      // Sunday → Monday
    else if (day === 6) reginaToday.setDate(reginaToday.getDate() + 2); // Saturday → Monday

    return reginaToday;
  });

  const [holidays, setHolidays] = useState<string[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  useEffect(() => {
    const dateStr = formatDate(selectedDate);
    setLoading?.(true);
    getSlots(token, dateStr)
      .then(setSlots)
      .catch(err => {
        setMessage(err.message);
        setError?.(err.message);
      })
      .finally(() => setLoading?.(false));
    setSelectedSlotId(null); // reset slot selection when date changes
  }, [token, selectedDate]);

  useEffect(() => {
    getHolidays(token)
      .then(setHolidays)
      .catch(console.error);
  }, [token]);

  async function book() {
    if (!selectedSlotId) {
      setMessage('Please select a slot before booking.');
      return;
    }

    setLoading?.(true);
    try {
      await createBooking(token, selectedSlotId, formatDate(selectedDate));
      setMessage('Booking submitted!');
      getSlots(token, formatDate(selectedDate)).then(setSlots);
      setSelectedSlotId(null);
    } catch (err: any) {
      setMessage(err.message);
      setError?.(err.message);
    } finally {
      setLoading?.(false);
    }
  }

  return (
    <div className="slots-container" style={{ display: 'flex', gap: '2rem' }}>
      <div className="left-column" style={{ flex: 1 }}>
        <h2>Select a Date</h2>
        <Calendar
          onChange={(value) => {
            if (value instanceof Date) setSelectedDate(value);
          }}
          value={selectedDate}
          calendarType="gregory"
          selectRange={false}
          tileDisabled={({ date }) => {
            const zonedDate = toZonedTime(date, reginaTimeZone);
            const day = zonedDate.getDay();

            // Disable weekends
            if (day === 0 || day === 6) return true;

            // Disable past days
            const today = toZonedTime(new Date(), reginaTimeZone);
            const isPast = zonedDate < new Date(today.toDateString()); // compare without time part
            if (isPast) return true;

            // Disable holidays
            const dateStr = formatDate(zonedDate);
            if (holidays.includes(dateStr)) return true;

            return false;
          }}
        />
      </div>

      <div className="right-column" style={{ flex: 1 }}>
        <h2>Available Slots on {formatDate(selectedDate)}</h2>
        {message && <p className="message">{message}</p>}
        <ul className="slots-list" style={{ listStyle: 'none', padding: 0 }}>
          {slots.map((s) => (
            <li
              key={s.id}
              className={`slot-item ${selectedSlotId === s.id ? 'selected' : ''}`}
              onClick={() => s.available > 0 && setSelectedSlotId(s.id)}
              style={{
                cursor: s.available > 0 ? 'pointer' : 'not-allowed',
                padding: '0.5rem',
                margin: '0.3rem 0',
                border: selectedSlotId === s.id ? '2px solid blue' : '1px solid #ccc',
                borderRadius: '4px',
                userSelect: 'none',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{s.startTime} - {s.endTime}</span>
              <span>Available: {s.available}</span>
            </li>
          ))}
        </ul>
        <button disabled={!selectedSlotId} onClick={book} style={{ marginTop: '1rem' }}>
          Book Selected Slot
        </button>
      </div>
    </div>
  );
}
