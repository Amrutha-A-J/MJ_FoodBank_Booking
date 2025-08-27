export interface CreateRecurringVolunteerBookingRequest {
  roleId: number;
  startDate: string;
  endDate: string;
  pattern: 'daily' | 'weekly';
  daysOfWeek?: number[];
}

export interface RecurringVolunteerBookingResponse {
  recurringId: number;
  count: number;
}
