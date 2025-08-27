import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role, UserRole, StaffAccess } from '../types';
import type { LoginResponse } from '../api/users';
import { logout as apiLogout } from '../api/users';
import { API_BASE, apiFetch } from '../api/client';

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
  const [token, setToken] = useState('');
  const [role, setRole] = useState<Role>('' as Role);
  const [name, setName] = useState('');
  const [userRole, setUserRole] = useState<UserRole | ''>('');
  const [access, setAccess] = useState<StaffAccess[]>([]);
  const [id, setId] = useState<number | null>(null);

  function clearAuth() {
    setToken('');
    setRole('' as Role);
    setName('');
    setUserRole('');
    setAccess([]);
    setId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('userRole');
    localStorage.removeItem('access');
    localStorage.removeItem('id');
  }

  useEffect(() => {
    apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (r.ok && data?.token) {
          setToken(data.token);
          localStorage.setItem('token', data.token);
          const storedRole = localStorage.getItem('role') as Role | null;
          const storedName = localStorage.getItem('name') || '';
          const storedUserRole =
            (localStorage.getItem('userRole') as UserRole) || '';
          const storedAccess = localStorage.getItem('access');
          const storedId = localStorage.getItem('id');
          if (storedRole) setRole(storedRole);
          if (storedName) setName(storedName);
          if (storedUserRole) setUserRole(storedUserRole);
          setAccess(storedAccess ? JSON.parse(storedAccess) : []);
          setId(storedId ? Number(storedId) : null);
        } else {
          clearAuth();
        }
      })
      .catch(() => {
        clearAuth();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(u: LoginResponse) {
    try {
      const res = await apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) throw new Error('Invalid refresh');
      setToken(data.token);
      localStorage.setItem('token', data.token);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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

