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
import type { Slot, Holiday, Break, BlockedSlot } from '../../types';
import { formatTime } from '../../utils/time';
import FeedbackSnackbar from '../FeedbackSnackbar';
import { Box, Button } from '@mui/material';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ManageAvailability({ token }: { token: string }) {
  const [view, setView] = useState<'holiday' | 'blocked' | 'break'>('holiday');

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');

  const [allSlots, setAllSlots] = useState<Slot[]>([]);

  const [blockedDate, setBlockedDate] = useState('');
  const [blockedSlot, setBlockedSlot] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [blockedList, setBlockedList] = useState<BlockedSlot[]>([]);

  const [breakDay, setBreakDay] = useState('');
  const [breakSlot, setBreakSlot] = useState('');
  const [breakReason, setBreakReason] = useState('');
  const [breaks, setBreaks] = useState<Break[]>([]);

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
      await apiAddHoliday(token, newHoliday, newHolidayReason);
      setMessage('Holiday added');
      setNewHoliday('');
      setNewHolidayReason('');
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
      await apiAddBlockedSlot(token, blockedDate, Number(blockedSlot), blockedReason);
      setMessage('Slot blocked');
      setBlockedSlot('');
      setBlockedReason('');
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
      await apiAddBreak(token, Number(breakDay), Number(breakSlot), breakReason);
      setMessage('Break added');
      setBreakDay('');
      setBreakSlot('');
      setBreakReason('');
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
    return slot ? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}` : `Slot ${id}`;
  }
  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
      <Box maxWidth={600} width="100%" mt={4}>
        <h2>Manage Availability</h2>
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} />

      <div style={{ marginBottom: 16 }}>
        <label>
          Feature:
          <select value={view} onChange={e => setView(e.target.value as 'holiday' | 'blocked' | 'break')} style={{ marginLeft: 8 }}>
            <option value="holiday">Holidays</option>
            <option value="blocked">Blocked Slots</option>
            <option value="break">Staff Breaks</option>
          </select>
        </label>
      </div>

      {view === 'holiday' && (
        <section style={{ marginBottom: 24 }}>
          <h3>Holidays</h3>
          <input
            type="date"
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
          />
          <input
            type="text"
            placeholder="Reason"
            value={newHolidayReason}
            onChange={(e) => setNewHolidayReason(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <Button onClick={addHoliday} style={{ marginLeft: 8 }} variant="outlined" color="primary">Add Holiday</Button>
          <ul>
            {holidays.map(h => (
              <li key={h.date}>
                {h.date}{h.reason ? ` - ${h.reason}` : ''}{' '}
                <Button onClick={() => removeHoliday(h.date)} variant="outlined" color="primary">
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'blocked' && (
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
              <option key={s.id} value={s.id}>
                {formatTime(s.startTime)} - {formatTime(s.endTime)}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Reason"
            value={blockedReason}
            onChange={(e) => setBlockedReason(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <Button onClick={addBlocked} style={{ marginLeft: 8 }} variant="outlined" color="primary">Block Slot</Button>

          {blockedDate && (
            <ul>
              {blockedList.map(b => (
                <li key={b.slotId}>
                  {slotLabel(b.slotId)}{b.reason ? ` - ${b.reason}` : ''}{' '}
                  <Button onClick={() => removeBlocked(b.slotId)} variant="outlined" color="primary">
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view === 'break' && (
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
              <option key={s.id} value={s.id}>
                {formatTime(s.startTime)} - {formatTime(s.endTime)}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Reason"
            value={breakReason}
            onChange={(e) => setBreakReason(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <Button onClick={addBreak} style={{ marginLeft: 8 }} variant="outlined" color="primary">Add Break</Button>

          <ul>
            {breaks.map(b => (
              <li key={`${b.dayOfWeek}-${b.slotId}`}>
                {dayNames[b.dayOfWeek]} {slotLabel(b.slotId)}{b.reason ? ` - ${b.reason}` : ''}{' '}
                <Button onClick={() => removeBreak(b.dayOfWeek, b.slotId)} variant="outlined" color="primary">
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      </Box>
    </Box>
  );
}

