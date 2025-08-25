import { useCallback, useEffect, useState } from 'react';
import {
  getHolidays,
  addHoliday as apiAddHoliday,
  removeHoliday as apiRemoveHoliday,
  getAllSlots,
  getBlockedSlots,
  addBlockedSlot as apiAddBlockedSlot,
  removeBlockedSlot as apiRemoveBlockedSlot,
  getRecurringBlockedSlots,
  addRecurringBlockedSlot as apiAddRecurringBlockedSlot,
  removeRecurringBlockedSlot as apiRemoveRecurringBlockedSlot,
  getBreaks,
  addBreak as apiAddBreak,
  removeBreak as apiRemoveBreak,
} from '../../api/bookings';
import type {
  Slot,
  Holiday,
  Break,
  BlockedSlot,
  RecurringBlockedSlot,
} from '../../types';
import { formatTime } from '../../utils/time';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { Box, Button } from '@mui/material';
import type { AlertColor } from '@mui/material';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ManageAvailability() {
  const [view, setView] = useState<'holiday' | 'blocked' | 'break'>('holiday');

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');

  const [allSlots, setAllSlots] = useState<Slot[]>([]);

  const [blockedDate, setBlockedDate] = useState('');
  const [blockedSlot, setBlockedSlot] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [blockedList, setBlockedList] = useState<BlockedSlot[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState('');
  const [recurringWeeks, setRecurringWeeks] = useState<string[]>([]);
  const [recurringList, setRecurringList] = useState<RecurringBlockedSlot[]>([]);

  const [breakDay, setBreakDay] = useState('');
  const [breakSlot, setBreakSlot] = useState('');
  const [breakReason, setBreakReason] = useState('');
  const [breaks, setBreaks] = useState<Break[]>([]);

  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');

  const fetchHolidays = useCallback(async () => {
    try {
      const data = await getHolidays();
      setHolidays(data);
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const fetchBreaks = useCallback(async () => {
    try {
      const data = await getBreaks();
      setBreaks(data);
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const fetchRecurring = useCallback(async () => {
    try {
      const data = await getRecurringBlockedSlots();
      setRecurringList(data);
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const fetchBlocked = useCallback(async () => {
    if (!blockedDate) {
      setBlockedList([]);
      return;
    }
    try {
      const data = await getBlockedSlots(blockedDate);
      setBlockedList(data);
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [blockedDate]);

  useEffect(() => {
    fetchHolidays();
    fetchBreaks();
    fetchRecurring();
    getAllSlots()
      .then(setAllSlots)
      .catch(err => {
        setSnackbarSeverity('error');
        setMessage(err instanceof Error ? err.message : String(err));
      });
  }, [fetchHolidays, fetchBreaks, fetchRecurring]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  async function addHoliday() {
    if (!newHoliday) {
      setSnackbarSeverity('error');
      return setMessage('Select a date to add');
    }
    try {
      await apiAddHoliday(newHoliday, newHolidayReason);
      setSnackbarSeverity('success');
      setMessage('Holiday added');
      setNewHoliday('');
      setNewHolidayReason('');
      fetchHolidays();
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeHoliday(date: string) {
    try {
      await apiRemoveHoliday(date);
      setSnackbarSeverity('success');
      setMessage('Holiday removed');
      fetchHolidays();
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function addBlocked() {
    if (isRecurring) {
      if (recurringDay === '' || !blockedSlot || recurringWeeks.length === 0) {
        setSnackbarSeverity('error');
        return setMessage('Select day, week and slot');
      }
      try {
        await Promise.all(
          recurringWeeks.map(w =>
            apiAddRecurringBlockedSlot(
              Number(recurringDay),
              Number(w),
              Number(blockedSlot),
              blockedReason,
            ),
          ),
        );
        setSnackbarSeverity('success');
        setMessage('Recurring slot blocked');
        setBlockedSlot('');
        setBlockedReason('');
        setRecurringDay('');
        setRecurringWeeks([]);
        fetchRecurring();
      } catch (err: unknown) {
        setSnackbarSeverity('error');
        setMessage(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    if (!blockedDate || !blockedSlot) {
      setSnackbarSeverity('error');
      return setMessage('Select date and slot');
    }
    try {
      await apiAddBlockedSlot(blockedDate, Number(blockedSlot), blockedReason);
      setSnackbarSeverity('success');
      setMessage('Slot blocked');
      setBlockedSlot('');
      setBlockedReason('');
      fetchBlocked();
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeBlocked(slotId: number) {
    try {
      await apiRemoveBlockedSlot(blockedDate, slotId);
      setSnackbarSeverity('success');
      setMessage('Blocked slot removed');
      fetchBlocked();
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeRecurring(id: number) {
    try {
      await apiRemoveRecurringBlockedSlot(id);
      setSnackbarSeverity('success');
      setMessage('Recurring block removed');
      fetchRecurring();
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function addBreak() {
    if (breakDay === '' || breakSlot === '') {
      setSnackbarSeverity('error');
      return setMessage('Select day and slot');
    }
    try {
      await apiAddBreak(Number(breakDay), Number(breakSlot), breakReason);
      setSnackbarSeverity('success');
      setMessage('Break added');
      setBreakDay('');
      setBreakSlot('');
      setBreakReason('');
      fetchBreaks();
    } catch (err: unknown) {
      setSnackbarSeverity('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeBreak(day: number, slotId: number) {
    try {
      await apiRemoveBreak(day, slotId);
      setSnackbarSeverity('success');
      setMessage('Break removed');
      fetchBreaks();
    } catch (err: unknown) {
      setSnackbarSeverity('error');
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
      <FeedbackSnackbar open={!!message} onClose={() => setMessage('')} message={message} severity={snackbarSeverity} />

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
          <label>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={e => {
                setIsRecurring(e.target.checked);
                setBlockedDate('');
              }}
              style={{ marginRight: 4 }}
            />
            Recurring
          </label>
          {isRecurring ? (
            <>
              <select
                value={recurringDay}
                onChange={e => setRecurringDay(e.target.value)}
                style={{ marginLeft: 8 }}
              >
                <option value="">Select day</option>
                {dayNames.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
              <select
                multiple
                value={recurringWeeks}
                onChange={e =>
                  setRecurringWeeks(
                    Array.from(e.target.selectedOptions, o => o.value),
                  )
                }
                style={{ marginLeft: 8 }}
              >
                {[1, 2, 3, 4, 5].map(w => (
                  <option key={w} value={w}>
                    {`${w}${w === 1 ? 'st' : w === 2 ? 'nd' : w === 3 ? 'rd' : 'th'}`}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <input
              type="date"
              value={blockedDate}
              onChange={e => setBlockedDate(e.target.value)}
            />
          )}
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

          {!isRecurring && blockedDate && (
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

          {isRecurring && recurringDay !== '' && (
            <ul>
              {recurringList
                .filter(r => r.dayOfWeek === Number(recurringDay))
                .map(r => (
                  <li key={r.id}>
                    {`${r.weekOfMonth}${
                      r.weekOfMonth === 1
                        ? 'st'
                        : r.weekOfMonth === 2
                        ? 'nd'
                        : r.weekOfMonth === 3
                        ? 'rd'
                        : 'th'
                    } week`} {slotLabel(r.slotId)}
                    {r.reason ? ` - ${r.reason}` : ''}{' '}
                    <Button onClick={() => removeRecurring(r.id)} variant="outlined" color="primary">
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

