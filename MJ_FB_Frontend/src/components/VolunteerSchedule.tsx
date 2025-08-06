import { useState, useEffect, useCallback } from 'react';
import {
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  getMyVolunteerBookings,
  getHolidays,
  updateVolunteerBookingStatus,
} from '../api/api';
import type { VolunteerRole, Holiday, VolunteerBooking } from '../types';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { formatTime } from '../utils/time';
import VolunteerScheduleTable from './VolunteerScheduleTable';

const reginaTimeZone = 'America/Regina';

export default function VolunteerSchedule({ token }: { token: string }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const todayStr = formatInTimeZone(new Date(), reginaTimeZone, 'yyyy-MM-dd');
    return fromZonedTime(`${todayStr}T00:00:00`, reginaTimeZone);
  });
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [bookings, setBookings] = useState<VolunteerBooking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [requestRole, setRequestRole] = useState<VolunteerRole | null>(null);
  const [decisionBooking, setDecisionBooking] =
    useState<VolunteerBooking | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [message, setMessage] = useState('');

  const formatDate = (date: Date) =>
    formatInTimeZone(date, reginaTimeZone, 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    const dateStr = formatDate(currentDate);
    const reginaDate = toZonedTime(currentDate, reginaTimeZone);
    const weekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
    const holiday = holidays.some(h => h.date === dateStr);
    if (weekend || holiday) {
      setRoles([]);
      setBookings([]);
      return;
    }
    try {
      const [roleData, bookingData] = await Promise.all([
        getVolunteerRolesForVolunteer(token, dateStr),
        getMyVolunteerBookings(token),
      ]);
      setRoles(roleData);
      const filtered = bookingData.filter(
        b => b.date === dateStr && ['approved', 'submitted'].includes(b.status)
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

  function changeDay(delta: number) {
    setCurrentDate(d => new Date(d.getTime() + delta * 86400000));
  }

  async function submitRequest() {
    if (!requestRole) return;
    try {
      await requestVolunteerBooking(
        token,
        requestRole.id,
        formatDate(currentDate)
      );
      setRequestRole(null);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelSelected() {
    if (!decisionBooking) return;
    try {
      await updateVolunteerBookingStatus(
        token,
        decisionBooking.id,
        'cancelled'
      );
      await loadData();
    } catch {
      setMessage('Failed to cancel booking');
    } finally {
      setDecisionBooking(null);
      setDecisionReason('');
    }
  }

  const dateStr = formatDate(currentDate);
  const reginaDate = toZonedTime(currentDate, reginaTimeZone);
  const dayName = formatInTimeZone(currentDate, reginaTimeZone, 'EEEE');
  const holidayObj = holidays.find(h => h.date === dateStr);
  const isHoliday = !!holidayObj;
  const isWeekend = reginaDate.getDay() === 0 || reginaDate.getDay() === 6;
  const isClosed = isHoliday || isWeekend;

  const timeMap = new Map<string, VolunteerRole[]>();
  for (const r of roles) {
    const key = `${r.start_time}-${r.end_time}`;
    if (!timeMap.has(key)) timeMap.set(key, []);
    timeMap.get(key)!.push(r);
  }
  const maxSlots = Math.max(
    0,
    ...Array.from(timeMap.values(), arr => arr.length)
  );
  const rows = Array.from(timeMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, arr]) => {
      const [start, end] = key.split('-');
      return {
        time: `${formatTime(start)} - ${formatTime(end)}`,
        cells: arr.map(role => {
          const booking = bookings.find(
            b =>
              b.role_id === role.role_id &&
              b.start_time === role.start_time &&
              b.date === role.date
          );
          if (booking) {
            return {
              content: role.name,
              backgroundColor:
                booking.status === 'submitted' ? '#ffe5b4' : '#e0f7e0',
              onClick: () => {
                setDecisionBooking(booking);
                setDecisionReason('');
              },
            };
          }
          if (role.available <= 0) {
            return {
              content: `${role.name} (Full)`,
              backgroundColor: '#f5f5f5',
            };
          }
          return {
            content: role.name,
            onClick: () => {
              if (!isClosed) {
                setRequestRole(role);
                setMessage('');
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <button onClick={() => changeDay(-1)}>Previous</button>
        <h3>
          {dateStr} - {dayName}
          {isHoliday
            ? ` (Holiday${holidayObj?.reason ? ': ' + holidayObj.reason : ''})`
            : isWeekend
              ? ' (Weekend)'
              : ''}
        </h3>
        <button onClick={() => changeDay(1)}>Next</button>
      </div>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      {isClosed ? (
        <p style={{ textAlign: 'center' }}>
          Moose Jaw food bank is closed for {dayName}
        </p>
      ) : (
        <VolunteerScheduleTable maxSlots={maxSlots} rows={rows} />
      )}

      {requestRole && (
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
          <div style={{ background: 'white', padding: 16, borderRadius: 4, width: 300 }}>
            <h4>Request Booking</h4>
            <p>Request booking for {requestRole.name}?</p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <button onClick={submitRequest}>Submit</button>
              <button onClick={() => setRequestRole(null)}>Cancel</button>
            </div>
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
          <div style={{ background: 'white', padding: 16, borderRadius: 4, width: 320 }}>
            <h4>Cancel Booking</h4>
            <p>Cancel booking for {decisionBooking.role_name}?</p>
            <textarea
              placeholder="Reason for cancellation"
              value={decisionReason}
              onChange={e => setDecisionReason(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <button onClick={cancelSelected}>Confirm</button>
              <button
                onClick={() => {
                  setDecisionBooking(null);
                  setDecisionReason('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

