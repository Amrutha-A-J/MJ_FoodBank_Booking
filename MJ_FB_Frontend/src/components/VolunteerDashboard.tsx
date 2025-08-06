import { useState, useEffect } from 'react';
import { getMyVolunteerBookings } from '../api/api';
import type { VolunteerBooking } from '../types';
import { formatTime } from '../utils/time';
import VolunteerSchedule from './VolunteerSchedule';

export default function VolunteerDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<'schedule' | 'history'>('schedule');
  const [history, setHistory] = useState<VolunteerBooking[]>([]);

  useEffect(() => {
    if (tab === 'history') {
      getMyVolunteerBookings(token)
        .then(setHistory)
        .catch(() => {});
    }
  }, [tab, token]);

  return (
    <div>
      <h2>Volunteer Dashboard</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab('schedule')} disabled={tab === 'schedule'}>
          Schedule
        </button>
        <button
          onClick={() => setTab('history')}
          disabled={tab === 'history'}
          style={{ marginLeft: 8 }}
        >
          Booking History
        </button>
      </div>

      {tab === 'schedule' && <VolunteerSchedule token={token} />}

      {tab === 'history' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Role</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Time</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id}>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  {h.role_name}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{h.date}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  {formatTime(h.start_time)} - {formatTime(h.end_time)}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{h.status}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 8 }}>
                  No bookings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

