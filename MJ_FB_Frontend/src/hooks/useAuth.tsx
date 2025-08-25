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
  login: (u: LoginResponse) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [role, setRole] = useState<Role>(
    () => (localStorage.getItem('role') as Role) || ('' as Role)
  );
  const [name, setName] = useState(() => localStorage.getItem('name') || '');
  const [userRole, setUserRole] = useState<UserRole | ''>(
    () => (localStorage.getItem('userRole') as UserRole) || ''
  );
  const [access, setAccess] = useState<StaffAccess[]>(() => {
    const stored = localStorage.getItem('access');
    return stored ? (JSON.parse(stored) as StaffAccess[]) : [];
  });

  useEffect(() => {
    if (token) return;
    apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (data?.token) {
          setToken(data.token);
          localStorage.setItem('token', data.token);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(u: LoginResponse) {
    setRole(u.role);
    setName(u.name);
    setUserRole(u.userRole || '');
    setAccess(u.access || []);
    localStorage.setItem('role', u.role);
    localStorage.setItem('name', u.name);
    if (u.userRole) localStorage.setItem('userRole', u.userRole);
    else localStorage.removeItem('userRole');
    localStorage.setItem('access', JSON.stringify(u.access || []));
    apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (data?.token) {
          setToken(data.token);
          localStorage.setItem('token', data.token);
        }
      })
      .catch(() => {});
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {}
    setToken('');
    setRole('' as Role);
    setName('');
    setUserRole('');
    setAccess([]);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('userRole');
    localStorage.removeItem('access');
  }

  const value: AuthContextValue = {
    token,
    role,
    name,
    userRole,
    access,
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

