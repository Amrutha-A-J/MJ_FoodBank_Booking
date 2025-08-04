// src/api/api.ts
// Read API base URL from environment or fall back to localhost
import type { Role } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export interface LoginResponse {
  token: string;
  role: Role;
  name: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function staffExists(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/staff/exists`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.exists as boolean;
}

export async function createAdmin(
  firstName: string,
  lastName: string,
  staffId: string,
  role: string,
  email: string,
  password: string
) {
  const res = await fetch(`${API_BASE}/staff/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, staffId, role, email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createStaff(
  token: string,
  firstName: string,
  lastName: string,
  staffId: string,
  role: string,
  email: string,
  password: string
) {
  const res = await fetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ firstName, lastName, staffId, role, email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSlots(token: string, date?: string) {
    let url = `${API_BASE}/slots`;
    if (date) url += `?date=${encodeURIComponent(date)}`;
    const res = await fetch(url, {
      headers: { Authorization: token }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

// api.ts
export async function addUser(
  token: string,
  name: string,
  email: string,
  password: string,
  role: string,
  phone?: string
) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ name, email, password, role, phone }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
} 
  
  export async function createBooking(token: string, slotId: string, date: string) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({ slotId, date, requestData: '' }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

export async function getBookings(token: string) {
  const res = await fetch(`${API_BASE}/bookings`, {
    headers: { Authorization: token }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHolidays(token: string) {
    const res = await fetch(`${API_BASE}/holidays`, {
      headers: { Authorization: token }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // assume returns: string[] of dates like "2025-07-21"
  }
  
  export async function addHoliday(token: string, date: string) {
    const res = await fetch(`${API_BASE}/holidays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify({ date })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  
  export async function removeHoliday(token: string, date: string) {
    const res = await fetch(`${API_BASE}/holidays/${encodeURIComponent(date)}`, {
      method: 'DELETE',
      headers: { Authorization: token }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

export async function decideBooking(token: string, bookingId: string, decision: 'approve'|'reject') {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function searchUsers(token: string, search: string) {
    const res = await fetch(`${API_BASE}/users/search?search=${encodeURIComponent(search)}`, {
      headers: { Authorization: token }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // returns array of users
  }
  
  export async function createBookingForUser(
    token: string,
    userId: number,
    slotId: number,
    date: string,
    isStaffBooking: boolean
  ) {
    const res = await fetch(`${API_BASE}/bookings/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify({ userId, slotId, date, isStaffBooking })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  