export type Role = 'staff' | 'shopper' | 'delivery' | 'volunteer' | 'agency';
export type UserRole = 'shopper' | 'delivery';
export type StaffRole = 'staff';
export type StaffAccess =
  | 'pantry'
  | 'volunteer_management'
  | 'warehouse'
  | 'admin'
  | 'donor_management'
  | 'payroll_management'
  | 'donation_entry'
  | 'aggregations';

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
  access?: StaffAccess[];
  id?: number;
  consent?: boolean;
}

export type PasswordResetBody = { email: string } | { clientId: string };

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

export type VolunteerBookingStatus =
  | 'approved'
  | 'cancelled'
  | 'no_show'
  | 'completed';

export interface RawVolunteerBooking {
  id: number;
  status: VolunteerBookingStatus;
  role_id: number;
  date: string;
  start_time?: string;
  end_time?: string;
  startTime?: string;
  endTime?: string;
  role_name: string;
  category_name?: string;
  volunteer_id?: number;
  volunteer_name?: string;
  status_color?: string;
  reschedule_token?: string;
  recurring_id?: number;
  note?: string | null;
}

export interface VolunteerBooking {
  id: number;
  status: VolunteerBookingStatus;
  role_id: number;
  date: string;
  start_time: string;
  end_time: string;
  startTime?: string;
  endTime?: string;
  role_name: string;
  category_name?: string;
  volunteer_id?: number;
  volunteer_name?: string;
  status_color?: string;
  reschedule_token?: string;
  recurring_id?: number;
  note?: string | null;
}

export interface VolunteerRecurringBooking {
  id: number;
  role_id: number;
  start_date: string;
  end_date: string | null;
  pattern: 'daily' | 'weekly';
  days_of_week: number[] | null;
}

export interface VolunteerBookingDetail {
  id: number;
  status: VolunteerBookingStatus;
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
  note?: string | null;
}

export interface RecurringVolunteerBooking {
  id: number;
  role_id: number;
  start_date: string;
  end_date: string | null;
  pattern: 'daily' | 'weekly';
  days_of_week: number[];
}

export interface UserProfile {
  id?: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  clientId?: number;
  bookingsThisMonth?: number;
  roles?: StaffAccess[];
  trainedAreas?: string[];
  defaultBookingNote?: string;
  consent?: boolean;
}

export interface UserPreferences {
  emailReminders: boolean;
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

export interface VolunteerMasterRole {
  id: number;
  name: string;
}

export interface EditableSlot {
  id: number;
  role_id: number;
  name: string;
  start_time: string;
  end_time: string;
  max_volunteers: number;
  category_id: number;
  category_name: string;
  is_wednesday_slot: boolean;
  is_active: boolean;
}

export interface BookingResponse {
  id: number;
  status: string;
  date: string;
  slot_id: number | null;
  user_id?: number | null;
  new_client_id?: number | null;
  newClientId?: number | null;
  is_staff_booking?: boolean;
  reschedule_token?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  client_id?: number | null;
  profile_link?: string;
  visits_this_month?: number;
  approved_bookings_this_month?: number;
  start_time?: string | null;
  end_time?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string;
  client_note?: string | null;
  staff_note?: string | null;
}

export interface Booking
  extends Omit<BookingResponse, 'new_client_id' | 'startTime' | 'endTime'> {
  start_time: string | null;
  end_time: string | null;
  startTime: string | null;
  endTime: string | null;
  newClientId: number | null;
  note?: string;
}

export interface BookingActionResponse {
  message: string;
  status?: string;
  bookingsThisMonth?: number;
  rescheduleToken?: string;
  googleCalendarUrl?: string;
  icsUrl?: string;
}

export interface VolunteerBookingRequest {
  roleId: number;
  date: string;
  type: 'volunteer shift';
  note?: string;
}

export interface ResolveVolunteerBookingConflictRequest {
  existingBookingId: number;
  roleId?: number;
  date?: string;
  keep: 'existing' | 'new';
  type: 'volunteer shift';
}

export interface VolunteerBookingInfo {
  id?: number;
  role_id: number;
  role_name: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface VolunteerBookingConflict {
  attempted: VolunteerBookingInfo;
  existing: VolunteerBookingInfo;
}

export interface ClientVisit {
  id: number;
  date: string;
  clientId: number | null;
  clientName: string | null;
  anonymous: boolean;
  weightWithCart: number;
  weightWithoutCart: number;
  adults: number;
  children: number;
  petItem: number;
  verified: boolean;
  note?: string;
}

export interface SunshineBag {
  date: string;
  weight: number;
  clientCount: number;
}

export interface AgencyClient {
  clientId: number;
  name: string;
  email?: string;
}
