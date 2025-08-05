// src/api/api.ts
// Read API base URL from environment or fall back to localhost
import type { Role } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export interface LoginResponse {
  token: string;
  role: Role;
  name: string;
  bookingsThisMonth?: number;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.message || data.error || JSON.stringify(data);
    } catch {
      message = await res.text();
    }
    throw new Error(message);
  }
  return res.json();
}

export async function loginUser(
  clientId: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: Number(clientId), password }),
  });
  return handleResponse(res);
}

export async function loginStaff(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function staffExists(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/staff/exists`);
  const data = await handleResponse(res);
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
  return handleResponse(res);
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
  return handleResponse(res);
}

export async function getSlots(token: string, date?: string) {
    let url = `${API_BASE}/slots`;
    if (date) url += `?date=${encodeURIComponent(date)}`;
    const res = await fetch(url, {
      headers: { Authorization: token }
    });
    return handleResponse(res);
  }

// api.ts
export async function addUser(
  token: string,
  firstName: string,
  lastName: string,
  clientId: string,
  role: string,
  password: string,
  email?: string,
  phone?: string
) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({
      firstName,
      lastName,
      clientId: Number(clientId),
      role,
      password,
      email,
      phone,
    }),
  });
  return handleResponse(res);
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
    return handleResponse(res);
  }

export async function getBookings(token: string) {
  const res = await fetch(`${API_BASE}/bookings`, {
    headers: { Authorization: token }
  });
  return handleResponse(res);
}

export async function getHolidays(token: string) {
    const res = await fetch(`${API_BASE}/holidays`, {
      headers: { Authorization: token }
    });
    return handleResponse(res); // assume returns: string[] of dates like "2025-07-21"
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
    return handleResponse(res);
  }
  
  export async function removeHoliday(token: string, date: string) {
    const res = await fetch(`${API_BASE}/holidays/${encodeURIComponent(date)}`, {
      method: 'DELETE',
      headers: { Authorization: token }
    });
    return handleResponse(res);
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
  return handleResponse(res);
}

export async function searchUsers(token: string, search: string) {
    const res = await fetch(`${API_BASE}/users/search?search=${encodeURIComponent(search)}`, {
      headers: { Authorization: token }
    });
    return handleResponse(res); // returns array of users
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
    return handleResponse(res);
  }
  