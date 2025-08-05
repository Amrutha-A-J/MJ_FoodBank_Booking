import { useCallback, useEffect, useState } from 'react';
import {
  getHolidays,
  addHoliday as apiAddHoliday,
  removeHoliday as apiRemoveHoliday,
  getAllSlots,
  getBlockedSlots,
  addBlockedSlot as apiAddBlockedSlot,
  removeBlockedSlot as apiRemoveBlockedSlot,
  getBreaks,
  addBreak as apiAddBreak,
  removeBreak as apiRemoveBreak,
} from '../../api/api';
import type { Slot } from '../../types';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ManageAvailability({ token }: { token: string }) {
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');

  const [allSlots, setAllSlots] = useState<Slot[]>([]);

  const [blockedDate, setBlockedDate] = useState('');
  const [blockedSlot, setBlockedSlot] = useState('');
  const [blockedList, setBlockedList] = useState<number[]>([]);

  const [breakDay, setBreakDay] = useState('');
  const [breakSlot, setBreakSlot] = useState('');
  const [breaks, setBreaks] = useState<{ dayOfWeek: number; slotId: number }[]>([]);

  const [message, setMessage] = useState('');

  const fetchHolidays = useCallback(async () => {
    try {
      const data = await getHolidays(token);
      setHolidays(data);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [token]);

  const fetchBreaks = useCallback(async () => {
    try {
      const data = await getBreaks(token);
      setBreaks(data);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [token]);

  const fetchBlocked = useCallback(async () => {
    if (!blockedDate) {
      setBlockedList([]);
      return;
    }
    try {
      const data = await getBlockedSlots(token, blockedDate);
      setBlockedList(data);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [token, blockedDate]);

  useEffect(() => {
    fetchHolidays();
    fetchBreaks();
    getAllSlots(token)
      .then(setAllSlots)
      .catch(err => setMessage(err instanceof Error ? err.message : String(err)));
  }, [fetchHolidays, fetchBreaks, token]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  async function addHoliday() {
    if (!newHoliday) return setMessage('Select a date to add');
    try {
      await apiAddHoliday(token, newHoliday);
      setMessage('Holiday added');
      setNewHoliday('');
      fetchHolidays();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeHoliday(date: string) {
    try {
      await apiRemoveHoliday(token, date);
      setMessage('Holiday removed');
      fetchHolidays();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function addBlocked() {
    if (!blockedDate || !blockedSlot) return setMessage('Select date and slot');
    try {
      await apiAddBlockedSlot(token, blockedDate, Number(blockedSlot));
      setMessage('Slot blocked');
      setBlockedSlot('');
      fetchBlocked();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeBlocked(slotId: number) {
    try {
      await apiRemoveBlockedSlot(token, blockedDate, slotId);
      setMessage('Blocked slot removed');
      fetchBlocked();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function addBreak() {
    if (breakDay === '' || breakSlot === '') return setMessage('Select day and slot');
    try {
      await apiAddBreak(token, Number(breakDay), Number(breakSlot));
      setMessage('Break added');
      setBreakDay('');
      setBreakSlot('');
      fetchBreaks();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeBreak(day: number, slotId: number) {
    try {
      await apiRemoveBreak(token, day, slotId);
      setMessage('Break removed');
      fetchBreaks();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function slotLabel(id: number) {
    const slot = allSlots.find(s => s.id === id.toString());
    return slot ? `${slot.startTime} - ${slot.endTime}` : `Slot ${id}`;
  }

  return (
    <div>
      <h2>Manage Availability</h2>
      {message && <p>{message}</p>}

      <section style={{ marginBottom: 24 }}>
        <h3>Holidays</h3>
        <input
          type="date"
          value={newHoliday}
          onChange={(e) => setNewHoliday(e.target.value)}
        />
        <button onClick={addHoliday} style={{ marginLeft: 8 }}>Add Holiday</button>
        <ul>
          {holidays.map(date => (
            <li key={date}>
              {date}{' '}
              <button onClick={() => removeHoliday(date)} style={{ color: 'red' }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>Blocked Slots</h3>
        <input
          type="date"
          value={blockedDate}
          onChange={(e) => setBlockedDate(e.target.value)}
        />
        <select
          value={blockedSlot}
          onChange={(e) => setBlockedSlot(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="">Select slot</option>
          {allSlots.map(s => (
            <option key={s.id} value={s.id}>{s.startTime} - {s.endTime}</option>
          ))}
        </select>
        <button onClick={addBlocked} style={{ marginLeft: 8 }}>Block Slot</button>

        {blockedDate && (
          <ul>
            {blockedList.map(id => (
              <li key={id}>
                {slotLabel(id)}{' '}
                <button onClick={() => removeBlocked(id)} style={{ color: 'red' }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Staff Breaks</h3>
        <select
          value={breakDay}
          onChange={(e) => setBreakDay(e.target.value)}
        >
          <option value="">Select day</option>
          {dayNames.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
        <select
          value={breakSlot}
          onChange={(e) => setBreakSlot(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="">Select slot</option>
          {allSlots.map(s => (
            <option key={s.id} value={s.id}>{s.startTime} - {s.endTime}</option>
          ))}
        </select>
        <button onClick={addBreak} style={{ marginLeft: 8 }}>Add Break</button>

        <ul>
          {breaks.map(b => (
            <li key={`${b.dayOfWeek}-${b.slotId}`}>
              {dayNames[b.dayOfWeek]} {slotLabel(b.slotId)}{' '}
              <button onClick={() => removeBreak(b.dayOfWeek, b.slotId)} style={{ color: 'red' }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

