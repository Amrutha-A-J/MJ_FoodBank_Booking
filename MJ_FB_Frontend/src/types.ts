export type Role =
  | 'staff'
  | 'shopper'
  | 'delivery'
  | 'volunteer_coordinator'
  | 'admin';

export type StaffRole = 'staff' | 'volunteer_coordinator' | 'admin';

export function isStaffRole(role: Role): boolean {
  return role === 'staff' || role === 'volunteer_coordinator' || role === 'admin';
}

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
