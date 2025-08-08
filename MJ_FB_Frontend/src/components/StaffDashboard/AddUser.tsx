import { useState } from 'react';
import { addUser, createStaff } from '../../api/api';
import type { UserRole, StaffRole } from '../../types';
import FeedbackSnackbar from '../FeedbackSnackbar';
import FeedbackModal from '../FeedbackModal';

export default function AddUser({ token }: { token: string }) {
  const [mode, setMode] = useState<'user' | 'staff'>('user');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('shopper');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientId, setClientId] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('staff');
  const [password, setPassword] = useState('');

  async function submitUser() {
    if (!firstName || !lastName || !clientId || !password) {
      setError('First name, last name, client ID and password required');
      return;
    }
    try {
      await addUser(
        token,
        firstName,
        lastName,
        clientId,
        role,
        password,
        email || undefined,
        phone || undefined
      );
      setSuccess('User added successfully');
      setFirstName('');
      setLastName('');
      setClientId('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRole('shopper');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submitStaff() {
    if (!firstName || !lastName || !email || !password) {
      setError('All fields required');
      return;
    }
    try {
      await createStaff(firstName, lastName, staffRole, email, password, token);
      setSuccess('Staff added successfully');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setStaffRole('staff');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <h2>{mode === 'user' ? 'Create User' : 'Create Staff'}</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setMode('user')}>Create User</button>
        <button onClick={() => setMode('staff')} style={{ marginLeft: 8 }}>Create Staff</button>
      </div>
      <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
      <FeedbackModal open={!!success} onClose={() => setSuccess('')} message={success} />
      {mode === 'user' ? (
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
              Client ID:{' '}
              <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Email (optional):{' '}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Phone (optional):{' '}
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Password:{' '}
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Role:{' '}
              <select value={role} onChange={e => setRole(e.target.value as UserRole)}>
                <option value="shopper">Shopper</option>
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
              Staff Role:{' '}
              <select value={staffRole} onChange={e => setStaffRole(e.target.value as StaffRole)}>
                <option value="staff">Staff</option>
                <option value="volunteer_coordinator">Volunteer Coordinator</option>
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

