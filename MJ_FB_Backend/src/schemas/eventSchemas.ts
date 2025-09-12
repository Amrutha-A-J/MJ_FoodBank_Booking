import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1),
  details: z.string().optional(),
  category: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  visibleToVolunteers: z.boolean().optional(),
  visibleToClients: z.boolean().optional(),
  priority: z.number().int().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'endDate must be on or after startDate',
  path: ['endDate'],
});

export const updateEventSchema = z.object({
  priority: z.number().int(),
});

export const listEventsSchema = z.object({});

export type CreateEventInput = z.infer<typeof createEventSchema>;
