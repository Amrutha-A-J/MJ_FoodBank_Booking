import { Slot } from './models/slot';

export type BookingStatus =
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'no_show'
  | 'expired'
  | 'visited';

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

export const slots: Slot[] = [];

export const bookings: Booking[] = [];

let slotsInitialized = false;

// Initialize slots: 9:30 to 14:30 every 30 minutes (10 slots)
export function initializeSlots() {
  if (slotsInitialized) {
    return;
  }

  slots.length = 0;
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

  slotsInitialized = true;
}
