export type Role = 'staff' | 'shopper' | 'delivery';
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
}
