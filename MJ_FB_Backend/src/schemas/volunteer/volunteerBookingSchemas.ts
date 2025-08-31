import { z } from 'zod';

export const recurringBookingSchema = z.object({
  roleId: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
  pattern: z.enum(['daily', 'weekly']),
  daysOfWeek: z.array(z.number().int()).optional(),
});

export type RecurringBookingSchema = z.infer<typeof recurringBookingSchema>;

export const recurringBookingForVolunteerSchema = recurringBookingSchema.extend({
  volunteerId: z.number().int(),
  force: z.boolean().optional(),
});

export type RecurringBookingForVolunteerSchema = z.infer<
  typeof recurringBookingForVolunteerSchema
>;
