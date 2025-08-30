import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Link } from '@mui/material';
import type { Role, UserRole, StaffAccess } from '../types';
import type { LoginResponse } from '../api/users';
import { logout as apiLogout } from '../api/users';
import { API_BASE, apiFetch } from '../api/client';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { getRandomAppreciation } from '../utils/appreciationMessages';

interface AuthContextValue {
  token: string;
  role: Role;
  name: string;
  userRole: UserRole | '';
  access: StaffAccess[];
  id: number | null;
  login: (u: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  cardUrl: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(
    () => (localStorage.getItem('role') as Role) || ('' as Role),
  );
  const [name, setName] = useState(() => localStorage.getItem('name') || '');
  const [userRole, setUserRole] = useState<UserRole | ''>(
    () => (localStorage.getItem('userRole') as UserRole) || '',
  );
  const [access, setAccess] = useState<StaffAccess[]>(() => {
    const stored = localStorage.getItem('access');
    return stored ? JSON.parse(stored) : [];
  });
  const [id, setId] = useState<number | null>(() => {
    const stored = localStorage.getItem('id');
    return stored ? Number(stored) : null;
  });
  const [token, setToken] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [cardUrl, setCardUrl] = useState('');

  const clearAuth = useCallback(() => {
    setToken('');
    setRole('' as Role);
    setName('');
    setUserRole('');
    setAccess([]);
    setId(null);
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('userRole');
    localStorage.removeItem('access');
    localStorage.removeItem('id');
  }, []);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (!['role', 'name', 'userRole', 'access', 'id'].includes(e.key || ''))
        return;
      const newRole = localStorage.getItem('role');
      const newName = localStorage.getItem('name');
      const newUserRole = localStorage.getItem('userRole');
      const newAccess = localStorage.getItem('access');
      const newId = localStorage.getItem('id');

      if (!newRole || !newName) {
        clearAuth();
        setSessionMessage('Session ended in another tab');
      } else {
        setRole(newRole as Role);
        setName(newName);
        setUserRole((newUserRole as UserRole) || '');
        setAccess(newAccess ? JSON.parse(newAccess) : []);
        setId(newId ? Number(newId) : null);
        setSessionMessage('Session updated in another tab');
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clearAuth]);

  useEffect(() => {
    let active = true;
    const attemptRefresh = async (tries = 0): Promise<void> => {
      try {
        const res = await apiFetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
        });
        if (res.ok) {
          if (active) setToken('cookie');
        } else if (res.status === 409) {
          // 409 indicates another tab or request refreshed already
          // do not set token until this tab successfully refreshes
        } else if (res.status === 401) {
          if (active) {
            clearAuth();
            setSessionMessage('Session expired');
          }
        } else if (tries < 1) {
          await attemptRefresh(tries + 1);
        } else if (active) {
          clearAuth();
          setSessionMessage('Session expired');
        }
      } catch {
        if (tries < 1) {
          await attemptRefresh(tries + 1);
        } else if (active) {
          clearAuth();
          setSessionMessage('Session expired');
        }
      }
    };
    attemptRefresh();
    return () => {
      active = false;
    };
  }, [clearAuth]);

  async function login(u: LoginResponse) {
    try {
      const res = await apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' });
      if (!res.ok && res.status !== 409) throw new Error('Invalid refresh');
      setToken('cookie');
      setRole(u.role);
      setName(u.name);
      setUserRole(u.userRole || '');
      setAccess(u.access || []);
      setId(u.id ?? null);
      localStorage.setItem('role', u.role);
      localStorage.setItem('name', u.name);
      if (u.userRole) localStorage.setItem('userRole', u.userRole);
      else localStorage.removeItem('userRole');
      localStorage.setItem('access', JSON.stringify(u.access || []));
      if (u.id) localStorage.setItem('id', String(u.id));
      else localStorage.removeItem('id');
      localStorage.removeItem('encouragementOrder');
      localStorage.removeItem('encouragementIndex');
      setSessionMessage(
        u.role === 'volunteer' ? getRandomAppreciation() : '',
      );
      try {
        const statsRes = await apiFetch(`${API_BASE}/stats`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setCardUrl(data.cardUrl || '');
        } else {
          setCardUrl('');
        }
      } catch {
        setCardUrl('');
      }
    } catch (e) {
      clearAuth();
      throw e;
    }
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {}
    clearAuth();
  }

  const value: AuthContextValue = {
    token,
    role,
    name,
    userRole,
    access,
    id,
    login,
    logout,
    cardUrl,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <FeedbackSnackbar
        open={!!sessionMessage}
        onClose={() => setSessionMessage('')}
        message={
          cardUrl ? (
            <>
              {sessionMessage} <Link href={cardUrl} download>Download card</Link>
            </>
          ) : (
            sessionMessage
          )
        }
        severity="info"
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function AgencyGuard({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== 'agency') return <Navigate to="/" replace />;
  return <>{children}</>;
}

