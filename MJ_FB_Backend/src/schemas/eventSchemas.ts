import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1),
  details: z.string().optional(),
  category: z.string().min(1),
  date: z.string().min(1),
  staffIds: z.array(z.number().int()).optional(),
  visibleToVolunteers: z.boolean().optional(),
  visibleToClients: z.boolean().optional(),
});

export const listEventsSchema = z.object({});

export type CreateEventInput = z.infer<typeof createEventSchema>;
