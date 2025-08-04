import { useEffect, useState } from 'react';
import { getHolidays, addHoliday as apiAddHoliday, removeHoliday as apiRemoveHoliday } from '../../api/api';

export default function ManageHolidays({ token }: { token: string }) {
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchHolidays();
  }, []);

  async function fetchHolidays() {
    try {
      const data = await getHolidays(token);
      setHolidays(data);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function addHoliday() {
    if (!newDate) return setMessage('Select a date to add');
    try {
      await apiAddHoliday(token, newDate);
      setMessage('Holiday added');
      setNewDate('');
      fetchHolidays();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function removeHoliday(date: string) {
    try {
      await apiRemoveHoliday(token, date);
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
