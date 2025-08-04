import { useState } from 'react';
import { addUser } from '../../api/api';
import type { Role } from '../../types';

export default function AddUser({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('shopper');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');   // ✅ NEW
  const [phone, setPhone] = useState('');         // optional
  const [message, setMessage] = useState('');

  async function submit() {
    if (!email || !name || !password) {
      setMessage('Name, email and password required');
      return;
    }
    try {
      await addUser(token, name, email, password, role, phone);
      setMessage('User added successfully');
      setEmail('');
      setName('');
      setPassword('');
      setPhone('');
      setRole('shopper');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <h2>Add User</h2>
      {message && <p>{message}</p>}
      <div style={{ marginBottom: 8 }}>
        <label>
          Name:{' '}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full name"
          />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Email:{' '}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Password:{' '}
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Secret password"
          />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Phone (optional):{' '}
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="555-1111"
          />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Role:{' '}
          <select value={role} onChange={e => setRole(e.target.value as Role)}>
            <option value="shopper">Shopper</option>
            <option value="staff">Staff</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>
      </div>
      <button onClick={submit}>Add User</button>
    </div>
  );
}
