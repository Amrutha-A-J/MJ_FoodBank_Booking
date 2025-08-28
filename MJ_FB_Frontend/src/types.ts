export type Role = 'staff' | 'shopper' | 'delivery' | 'volunteer' | 'agency';
export type UserRole = 'shopper' | 'delivery';
export type StaffRole = 'staff';
export type StaffAccess =
  | 'pantry'
  | 'volunteer_management'
  | 'warehouse'
  | 'admin';

export interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  access: StaffAccess[];
}

export interface LoginResponse {
  role: Role;
  name: string;
  bookingsThisMonth?: number;
  userRole?: UserRole;
  access: StaffAccess[];
  id?: number;
}

export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  maxCapacity?: number;
  available?: number;
  reason?: string;
  status?: 'blocked' | 'break';
}

export interface SlotsByDate {
  date: string;
  slots: Slot[];
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
  date?: string;
  slotId: number;
  reason: string;
  status?: 'blocked' | 'break';
}

export interface RecurringBlockedSlot {
  id: number;
  dayOfWeek: number;
  weekOfMonth: number;
  slotId: number;
  reason: string;
}

export interface VolunteerRole {
  id: number;
  role_id: number;
  name: string;
  start_time: string;
  end_time: string;
  max_volunteers: number;
  booked: number;
  available: number;
  status: string;
  date: string;
  category_id: number;
  category_name: string;
  is_wednesday_slot: boolean;
}

export interface VolunteerRoleShift {
  id: number;
  start_time: string;
  end_time: string;
  is_wednesday_slot: boolean;
  is_active: boolean;
}

export interface VolunteerRoleWithShifts {
  id: number;
  role_id: number;
  category_id: number;
  name: string;
  max_volunteers: number;
  category_name: string;
  shifts: VolunteerRoleShift[];
}

export interface VolunteerRoleGroup {
  category_id: number;
  category: string;
  roles: {
    id: number;
    name: string;
    slots: VolunteerRole[];
  }[];
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
  reschedule_token?: string;
  recurring_id?: number;
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
  can_book?: boolean;
  reschedule_token?: string;
  recurring_id?: number;
}

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  clientId?: number;
  bookingsThisMonth?: number;
  roles?: StaffAccess[];
  username?: string;
  trainedAreas?: string[];
}

export interface RoleOption {
  categoryId: number;
  categoryName: string;
  roleId: number;
  roleName: string;
}

export interface Shift {
  shiftId: number;
  startTime: string; // 'HH:MM:SS'
  endTime: string;   // 'HH:MM:SS'
  maxVolunteers: number;
}
