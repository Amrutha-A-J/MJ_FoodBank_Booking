import { useEffect, useState } from 'react';
import { loginStaff, staffExists, createAdmin } from '../api/api';
import type { LoginResponse } from '../api/api';
import type { StaffRole } from '../types';

export default function StaffLogin({ onLogin, onBack }: { onLogin: (u: LoginResponse) => void; onBack: () => void }) {
  const [checking, setChecking] = useState(true);
  const [hasStaff, setHasStaff] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    staffExists()
      .then(exists => {
        setHasStaff(exists);
        setChecking(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : String(err));
        setChecking(false);
      });
  }, []);

  if (checking) return <div>Loading...</div>;

  return hasStaff ? (
    <StaffLoginForm onLogin={onLogin} error={error} onBack={onBack} />
  ) : (
    <CreateAdminForm onCreated={() => setHasStaff(true)} error={error} />
  );
}

function StaffLoginForm({ onLogin, error: initError, onBack }: { onLogin: (u: LoginResponse) => void; error: string; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await loginStaff(email, password);
      if (user.role !== 'staff') {
        setError('Not a staff account');
        return;
      }
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <a onClick={onBack} style={{ cursor: 'pointer' }}>User Login</a>
      <h2>Staff Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={submit}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function CreateAdminForm({ onCreated, error: initError }: { onCreated: () => void; error: string }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('admin');
  const [error, setError] = useState(initError);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAdmin(firstName, lastName, role, email, password);
      setMessage('Admin created. You can login now.');
      setTimeout(onCreated, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <h2>Create Admin Account</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <form onSubmit={submit}>
        <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
        <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
        <select value={role} onChange={e => setRole(e.target.value as StaffRole)}>
          <option value="staff">Staff</option>
          <option value="volunteer_coordinator">Volunteer Coordinator</option>
          <option value="admin">Admin</option>
        </select>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Create Admin</button>
      </form>
    </div>
  );
}
