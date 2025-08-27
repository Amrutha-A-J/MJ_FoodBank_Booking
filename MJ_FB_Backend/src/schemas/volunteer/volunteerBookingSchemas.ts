import { z } from 'zod';

export const recurringBookingSchema = z.object({
  roleId: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
  pattern: z.enum(['daily', 'weekly']),
  daysOfWeek: z.array(z.number().int()).optional(),
});

export type RecurringBookingSchema = z.infer<typeof recurringBookingSchema>;
