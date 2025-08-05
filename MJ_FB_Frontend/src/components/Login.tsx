import { useState } from 'react';
import { login } from '../api/api';
import type { LoginResponse } from '../api/api';

export default function Login({ onLogin, onStaff }: { onLogin: (user: LoginResponse) => void; onStaff: () => void }) {
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await login(clientId);
      localStorage.setItem('token', user.token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('name', user.name);
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
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
