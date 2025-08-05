export type Role = 'staff' | 'volunteer_coordinator' | 'admin' | 'shopper' | 'delivery';
export type StaffRole = 'staff' | 'volunteer_coordinator' | 'admin';

export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  available?: number;
}

export interface Break {
  dayOfWeek: number;
  slotId: number;
  reason: string;
}

export interface Holiday {
  date: string;
  reason: string;
}

export interface BlockedSlot {
  slotId: number;
  reason: string;
}
