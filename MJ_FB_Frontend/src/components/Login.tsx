import { useState } from 'react';
import { login } from '../api/api';
import type { LoginResponse } from '../api/api';

export default function Login({ onLogin }: { onLogin: (user: LoginResponse) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await login(email, password);
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
      <h2>Login</h2>
      {error && <p style={{color:'red'}}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
