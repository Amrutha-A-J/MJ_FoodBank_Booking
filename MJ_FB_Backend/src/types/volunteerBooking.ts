export interface CreateRecurringVolunteerBookingRequest {
  roleId: number;
  startDate: string;
  endDate: string;
  pattern: 'daily' | 'weekly';
  daysOfWeek?: number[];
}

export interface CreateRecurringVolunteerBookingForVolunteerRequest
  extends CreateRecurringVolunteerBookingRequest {
  volunteerId: number;
  force?: boolean;
}

export interface RecurringVolunteerBookingResult {
  recurringId: number;
  successes: string[];
  skipped: { date: string; reason: string }[];
}

export interface RecurringVolunteerBooking {
  id: number;
  role_id: number;
  start_date: string;
  end_date: string;
  pattern: 'daily' | 'weekly';
  days_of_week: number[];
}
