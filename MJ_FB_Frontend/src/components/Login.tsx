import { useState } from 'react';
import { loginUser } from '../api/api';
import type { LoginResponse } from '../api/api';
import { formatInTimeZone } from 'date-fns-tz';

export default function Login({ onLogin, onStaff }: { onLogin: (user: LoginResponse) => void; onStaff: () => void }) {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginUser(clientId, password);
      localStorage.setItem('token', user.token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('name', user.name);
      if (user.bookingsThisMonth !== undefined) {
        localStorage.setItem('bookingsThisMonth', user.bookingsThisMonth.toString());
        const currentMonth = formatInTimeZone(new Date(), 'America/Regina', 'yyyy-MM');
        localStorage.setItem('bookingsMonth', currentMonth);
      }
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <a onClick={onStaff} style={{ cursor: 'pointer' }}>Staff Login</a>
      <h2>User Login</h2>
      {error && <p style={{color:'red'}}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input value={clientId} onChange={e=>setClientId(e.target.value)} placeholder="Client ID"/>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
