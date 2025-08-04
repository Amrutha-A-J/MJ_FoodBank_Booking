export type UserRole = 'staff' | 'shopper' | 'delivery';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface Slot {
  id: string;
  startTime: string; // "09:30"
  endTime: string;   // "10:00"
  maxCapacity: number;
}

export type BookingStatus = 'submitted' | 'approved' | 'rejected' | 'preapproved';

export interface Booking {
  id: string;
  userId: string;
  slotId?: string | null;
  status: BookingStatus;
  requestData: string;
  date?: string | null; // Add date here
}


export const users: User[] = [
  {
    id: '1',
    name: 'Staff User',
    email: 'staff@fb.org',
    password: 'staffpass',
    role: 'staff',
  },
  {
  id: '2',
  name: 'John Shopper',
  email: 'shopper@fb.org',
  password: 'shopperpass',
  role: 'shopper',
},
{
  id: '3',
  name: 'Dina Delivery',
  email: 'delivery@fb.org',
  password: 'deliverypass',
  role: 'delivery',
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
