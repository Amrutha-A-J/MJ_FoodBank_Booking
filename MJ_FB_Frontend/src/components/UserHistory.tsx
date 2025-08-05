import { useState, useEffect } from 'react';
import {
  searchUsers,
  getBookingHistory,
  cancelBooking,
  decideBooking,
} from '../api/api';
import { formatInTimeZone } from 'date-fns-tz';
import ConfirmDialog from './ConfirmDialog';
import type { Role } from '../types';

const TIMEZONE = 'America/Regina';

interface User {
  id: number;
  name: string;
  client_id: number;
}

interface Booking {
  id: number;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  reason?: string;
}

export default function UserHistory({ token, role }: { token: string; role: Role }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<
    { id: number; action: 'cancel' | 'reject'; reason: string } | null
  >(null);

  const pageSize = 10;

  function openConfirm(id: number, action: 'cancel' | 'reject') {
    setConfirm({ id, action, reason: '' });
  }

  async function handleConfirm() {
    if (!confirm) return;
    try {
      if (confirm.action === 'cancel') {
        await cancelBooking(token, confirm.id.toString(), confirm.reason);
      } else {
        await decideBooking(token, confirm.id.toString(), 'reject', confirm.reason);
      }
      const opts: { status?: string; past?: boolean; userId?: number } = {};
      if (role === 'staff' && selected) opts.userId = selected.id;
      if (filter === 'past') opts.past = true;
      else if (filter !== 'all') opts.status = filter;
      const data = await getBookingHistory(token, opts);
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setBookings(sorted);
    } catch (err) {
      console.error('Error updating booking:', err);
    } finally {
      setConfirm(null);
    }
  }

  useEffect(() => {
    if (role !== 'staff') return;
    if (search.length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    searchUsers(token, search)
      .then(data => {
        if (active) setResults(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [search, token, role]);

  useEffect(() => {
    if (role === 'staff' && !selected) return;
    const opts: { status?: string; past?: boolean; userId?: number } = {};
    if (role === 'staff' && selected) opts.userId = selected.id;
    if (filter === 'past') opts.past = true;
    else if (filter !== 'all') opts.status = filter;
    getBookingHistory(token, opts)
      .then(data => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setBookings(sorted);
        setPage(1);
      })
      .catch(err => console.error('Error loading history:', err));
  }, [selected, filter, token, role]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const paginated = bookings.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <h2>Booking History</h2>
      {role === 'staff' && (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or client ID"
          />
          {results.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {results.map(u => (
                <li key={u.id}>
                  <button
                    onClick={() => {
                      setSelected(u);
                      setSearch(u.name);
                      setResults([]);
                    }}
                  >
                    {u.name} ({u.client_id})
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {(role === 'staff' ? selected !== null : true) && (
        <div>
          {role === 'staff' && selected && <h3>History for {selected.name}</h3>}
          <div>
            <label htmlFor="filterHistory">Filter:</label>{' '}
            <select
              id="filterHistory"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
              <option value="past">Past</option>
            </select>
          </div>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={5}>No bookings.</td>
                  </tr>
                )}
                {paginated.map(b => {
                  const startDate = b.start_time
                    ? new Date(`${b.date}T${b.start_time}`)
                    : null;
                  const endDate = b.end_time
                    ? new Date(`${b.date}T${b.end_time}`)
                    : null;
                  const startTime =
                    startDate && !isNaN(startDate.getTime())
                      ? formatInTimeZone(startDate, TIMEZONE, 'h:mm a')
                      : '';
                  const endTime =
                    endDate && !isNaN(endDate.getTime())
                      ? formatInTimeZone(endDate, TIMEZONE, 'h:mm a')
                      : '';
                  const dateCell = (() => {
                    const d = new Date(b.date);
                    return !isNaN(d.getTime())
                      ? formatInTimeZone(d, TIMEZONE, 'MMM d, yyyy')
                      : b.date;
                  })();
                  const showCancel =
                    role === 'shopper' && ['approved', 'submitted'].includes(b.status);
                  const staffReject = role === 'staff' && b.status === 'submitted';
                  const staffCancel = role === 'staff' && b.status === 'approved';
                  return (
                    <tr key={b.id}>
                      <td>{dateCell}</td>
                      <td>{startTime && endTime ? `${startTime} - ${endTime}` : ''}</td>
                      <td>{b.status}</td>
                      <td>{b.reason || ''}</td>
                      <td>
                        {(showCancel || staffCancel) && (
                          <button onClick={() => openConfirm(b.id, 'cancel')}>Cancel</button>
                        )}
                        {staffReject && (
                          <button
                            onClick={() => openConfirm(b.id, 'reject')}
                            style={{ marginLeft: showCancel || staffCancel ? 4 : 0 }}
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          message={
            confirm.action === 'cancel' ? 'Cancel booking?' : 'Reject booking?'
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        >
          <textarea
            value={confirm.reason}
            onChange={e =>
              setConfirm(c => (c ? { ...c, reason: e.target.value } : c))
            }
            placeholder="Reason"
            style={{ width: '100%' }}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
