import { useState, useEffect } from 'react';
import { getBookingHistory, cancelBooking } from '../api/api';
import type { Role } from '../types';

interface Booking {
  id: number;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

export default function Profile() {
  const token = localStorage.getItem('token') || '';
  const role = (localStorage.getItem('role') || '') as Role;
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    async function load() {
      if (!token || role === 'staff') return;
      const opts: { status?: string; past?: boolean } = {};
      if (filter === 'past') opts.past = true;
      else if (filter !== 'all') opts.status = filter;
      try {
        const data: Booking[] = await getBookingHistory(token, opts);
        setBookings(data);
      } catch (err) {
        console.error('Error loading history:', err);
      }
    }
    load();
  }, [token, role, filter]);

  async function handleCancel(id: number, reschedule = false) {
    const reason = prompt('Please provide a reason');
    if (reason === null) return;
    try {
      await cancelBooking(token, id.toString(), reason);
      if (reschedule) {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'slots' }));
      } else {
        const data: Booking[] = await getBookingHistory(token, {});
        setBookings(data);
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
    }
  }

  if (role === 'staff') {
    return (
      <div>
        <h2>User Profile</h2>
        <p>Profile view is only available for shoppers.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>User Profile</h2>
      <div>
        <label htmlFor="filter">Filter:</label>{' '}
        <select id="filter" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
          <option value="past">Past</option>
        </select>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {bookings.length === 0 && <li>No bookings.</li>}
        {bookings.map(b => {
          const canModify = ['submitted', 'approved'].includes(b.status) && b.date >= new Date().toISOString().split('T')[0];
          return (
            <li key={b.id} style={{ marginBottom: 8 }}>
              <strong>{b.date}</strong>{' '}
              {b.start_time && b.end_time ? `${b.start_time}-${b.end_time}` : ''} - {b.status}
              {b.reason && <em> ({b.reason})</em>}
              {canModify && (
                <>
                  <button style={{ marginLeft: 8 }} onClick={() => handleCancel(b.id)}>Cancel</button>
                  <button style={{ marginLeft: 4 }} onClick={() => handleCancel(b.id, true)}>Reschedule</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
