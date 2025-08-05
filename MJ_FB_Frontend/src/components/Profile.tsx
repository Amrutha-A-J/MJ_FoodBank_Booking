import { useState, useEffect } from 'react';
import { getBookingHistory } from '../api/api';

interface Booking {
  id: number;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
}

export default function Profile() {
  const token = localStorage.getItem('token') || '';
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    async function load() {
      if (!token) return;
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
  }, [token, filter]);

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
        {bookings.map(b => (
          <li key={b.id} style={{ marginBottom: 8 }}>
            <strong>{b.date}</strong>{' '}
            {b.start_time && b.end_time ? `${b.start_time}-${b.end_time}` : ''} - {b.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
