import { useEffect, useState } from 'react';

export default function ManageHolidays({ token }: { token: string }) {
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchHolidays();
  }, []);

  async function fetchHolidays() {
    try {
      const res = await fetch('http://localhost:4000/holidays', {
        headers: { Authorization: token }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHolidays(data);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function addHoliday() {
    if (!newDate) return setMessage('Select a date to add');
    try {
      const res = await fetch('http://localhost:4000/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ date: newDate }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage('Holiday added');
      setNewDate('');
      fetchHolidays();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function removeHoliday(date: string) {
    try {
      const res = await fetch(`http://localhost:4000/holidays/${date}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage('Holiday removed');
      fetchHolidays();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <h2>Manage Holidays</h2>
      {message && <p>{message}</p>}
      <input
        type="date"
        value={newDate}
        onChange={(e) => setNewDate(e.target.value)}
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
    </div>
  );
}
