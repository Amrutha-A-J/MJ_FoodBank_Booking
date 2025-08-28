import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role, UserRole, StaffAccess } from '../types';
import type { LoginResponse } from '../api/users';
import { logout as apiLogout } from '../api/users';
import { API_BASE, apiFetch } from '../api/client';
import FeedbackSnackbar from '../components/FeedbackSnackbar';

interface AuthContextValue {
  token: string;
  role: Role;
  name: string;
  userRole: UserRole | '';
  access: StaffAccess[];
  id: number | null;
  login: (u: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
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
  const [token, setToken] = useState(role ? 'cookie' : '');
  const [sessionMessage, setSessionMessage] = useState('');

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
        setToken('cookie');
        setSessionMessage('Session updated in another tab');
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clearAuth]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' });
        if (res.ok || res.status === 409) {
          // 409 indicates another tab or request refreshed already
          setToken('cookie');
        } else if (res.status === 401) {
          clearAuth();
        }
      } catch {
        /* network errors are ignored to allow retry */
      }
    })();
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <FeedbackSnackbar
        open={!!sessionMessage}
        onClose={() => setSessionMessage('')}
        message={sessionMessage}
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

