import { Slot } from './models/slot';
import type { User } from './models/user';

export type BookingStatus = 'submitted' | 'approved' | 'rejected' | 'preapproved' | 'cancelled';

export interface Booking {
  id: string;
  userId: string;
  slotId?: string | null;
  status: BookingStatus;
  requestData: string;
  date?: string | null; // Add date here
  isStaffBooking?: boolean;
  createdAt?: string;
}


export const users: User[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Shopper',
    clientId: 1001,
    role: 'shopper',
    email: 'shopper@fb.org',
    bookingsThisMonth: 0,
    bookingCountLastUpdated: new Date().toISOString(),
    password: '',
  },
  {
    id: 2,
    firstName: 'Dina',
    lastName: 'Delivery',
    clientId: 1002,
    role: 'delivery',
    email: 'delivery@fb.org',
    bookingsThisMonth: 0,
    bookingCountLastUpdated: new Date().toISOString(),
    password: '',
  },
];

export const slots: Slot[] = [];

export const bookings: Booking[] = [];

// Initialize slots: 9:30 to 14:30 every 30 minutes (10 slots)
export function initializeSlots() {
  let hour = 9;
  let minute = 30;

  for (let i = 1; i <= 10; i++) {
    const start = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    minute += 30;
    if (minute === 60) {
      minute = 0;
      hour++;
    }
    const end = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    slots.push({
      id: i.toString(),
      startTime: start,
      endTime: end,
      maxCapacity: 4,
    });
  }
}
