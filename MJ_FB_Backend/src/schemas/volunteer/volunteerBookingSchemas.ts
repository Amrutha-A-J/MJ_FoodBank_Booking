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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const volunteerBookingsByDateSchema = z.object({
  date: z
    .string()
    .regex(DATE_REGEX, { message: 'Invalid date format' })
    .refine((val) => {
      const parsed = new Date(val);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === val
      );
    }, 'Invalid date'),
});

export type VolunteerBookingsByDateSchema = z.infer<
  typeof volunteerBookingsByDateSchema
>;
