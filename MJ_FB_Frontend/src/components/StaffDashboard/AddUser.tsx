import { useState } from 'react';
import { addUser, createStaff } from '../../api/api';
import type { Role, StaffRole } from '../../types';

export default function AddUser({ token }: { token: string }) {
  const [mode, setMode] = useState<'user' | 'staff'>('user');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('shopper');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('warehouse_lead');

  async function submitUser() {
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

  async function submitStaff() {
    if (!firstName || !lastName || !email || !password || !staffId) {
      setMessage('All fields required');
      return;
    }
    try {
      await createStaff(token, firstName, lastName, staffId, staffRole, email, password);
      setMessage('Staff added successfully');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setStaffId('');
      setStaffRole('warehouse_lead');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <h2>{mode === 'user' ? 'Create User' : 'Create Staff'}</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setMode('user')}>Create User</button>
        <button onClick={() => setMode('staff')} style={{ marginLeft: 8 }}>Create Staff</button>
      </div>
      {message && <p>{message}</p>}
      {mode === 'user' ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <label>
              Name:{' '}
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Email:{' '}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Password:{' '}
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Secret password" />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Phone (optional):{' '}
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-1111" />
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
          <button onClick={submitUser}>Add User</button>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <label>
              First Name:{' '}
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Last Name:{' '}
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Staff ID:{' '}
              <input type="text" value={staffId} onChange={e => setStaffId(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Staff Role:{' '}
              <select value={staffRole} onChange={e => setStaffRole(e.target.value as StaffRole)}>
                <option value="warehouse_lead">Warehouse Lead</option>
                <option value="pantry_lead">Pantry Lead</option>
                <option value="volunteer_lead">Volunteer Lead</option>
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Email:{' '}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Password:{' '}
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
          </div>
          <button onClick={submitStaff}>Add Staff</button>
        </>
      )}
    </div>
  );
}
