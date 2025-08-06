export type Role =
  | 'staff'
  | 'shopper'
  | 'delivery'
  | 'volunteer_coordinator'
  | 'volunteer';
export type UserRole = 'shopper' | 'delivery';
export type StaffRole = 'staff' | 'volunteer_coordinator';

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

export interface VolunteerRole {
  id: number;
  name: string;
  category: string;
  start_time: string;
  end_time: string;
  max_volunteers: number;
  booked: number;
  available: number;
  status: string;
  date: string;
}

export interface VolunteerBooking {
  id: number;
  status: string;
  role_id: number;
  date: string;
  start_time: string;
  end_time: string;
  role_name: string;
  status_color?: string;
}

export interface VolunteerBookingDetail {
  id: number;
  status: string;
  role_id: number;
  volunteer_id: number;
  volunteer_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status_color?: string;
  role_name?: string;
}
