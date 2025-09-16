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
  isAuthenticated: boolean;
  role: Role;
  name: string;
  userRole: UserRole | '';
  access: StaffAccess[];
  id: number | null;
  login: (u: LoginResponse) => Promise<string>;
  logout: () => Promise<void>;
  cardUrl: string;
  ready: boolean;
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
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to parse access from localStorage', e);
      }
    }
    return [];
  });
  const [id, setId] = useState<number | null>(() => {
    const stored = localStorage.getItem('id');
    return stored ? Number(stored) : null;
  });
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');
  const [cardUrl, setCardUrl] = useState('');
  const [ready, setReady] = useState(false);

  const clearAuth = useCallback(() => {
    setAuthenticated(false);
    setRole('' as Role);
    setName('');
    setUserRole('');
    setAccess([]);
    setId(null);
    setCardUrl('');
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
        if (newAccess) {
          try {
            setAccess(JSON.parse(newAccess));
          } catch (e) {
            console.warn('Failed to parse access from storage event', e);
            setAccess([]);
          }
        } else {
          setAccess([]);
        }
        setId(newId ? Number(newId) : null);
        setSessionMessage('Session updated in another tab');
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clearAuth]);

  useEffect(() => {
    let active = true;
    const hadAuth = !!localStorage.getItem('role');
    const handleExpired = () => {
      clearAuth();
      if (hadAuth) setSessionMessage('Session expired');
    };
    const attemptRefresh = async (tries = 0): Promise<void> => {
      try {
        const res = await apiFetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
        });
        const hasRole = !!localStorage.getItem('role');
        if (res.ok) {
          if (active && hasRole) setAuthenticated(true);
        } else if (res.status === 409) {
          // Another tab already refreshed; token cookie is still valid
          if (active && hasRole) setAuthenticated(true);
        } else if (res.status === 401) {
          if (active) handleExpired();
        } else if (tries < 1) {
          await attemptRefresh(tries + 1);
        } else if (active) {
          handleExpired();
        }
      } catch {
        if (tries < 1) {
          await attemptRefresh(tries + 1);
        } else if (active) {
          handleExpired();
        }
      }
    };
    attemptRefresh().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [clearAuth]);

  async function login(u: LoginResponse): Promise<string> {
    try {
      const res = await apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' });
      if (!res.ok && res.status !== 409) throw new Error('Invalid refresh');
      const { role, name, userRole, access, id } = u;
      setAuthenticated(true);
      setRole(role);
      setName(name);
      setUserRole(userRole || '');
      setAccess(access || []);
      setId(id ?? null);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);
      if (userRole) localStorage.setItem('userRole', userRole);
      else localStorage.removeItem('userRole');
      localStorage.setItem('access', JSON.stringify(access || []));
      if (id) localStorage.setItem('id', String(id));
      else localStorage.removeItem('id');
      localStorage.removeItem('encouragementOrder');
      localStorage.removeItem('encouragementIndex');
      setSessionMessage(role === 'volunteer' ? getRandomAppreciation() : '');
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

      let redirect = '/';
      if (role === 'volunteer') redirect = '/volunteer-management';
      return redirect;
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
    isAuthenticated,
    role,
    name,
    userRole,
    access,
    id,
    login,
    logout,
    cardUrl,
    ready,
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

export function DonorManagementGuard({ children }: { children: React.ReactNode }) {
  const { access } = useAuth();
  const allowed = access.includes('donor_management') || access.includes('admin');
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
