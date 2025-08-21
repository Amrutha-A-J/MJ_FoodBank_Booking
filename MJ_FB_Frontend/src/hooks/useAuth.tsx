import { createContext, useContext, useEffect, useState } from 'react';
import type { Role, UserRole } from '../types';
import type { LoginResponse } from '../api/users';
import { logout as apiLogout } from '../api/users';

interface AuthContextValue {
  token: string;
  role: Role;
  name: string;
  userRole: UserRole | '';
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
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    if (token) return;
    fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
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
    localStorage.setItem('role', u.role);
    localStorage.setItem('name', u.name);
    if (u.userRole) localStorage.setItem('userRole', u.userRole);
    else localStorage.removeItem('userRole');
    fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
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
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('userRole');
  }

  const value: AuthContextValue = {
    token,
    role,
    name,
    userRole,
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

