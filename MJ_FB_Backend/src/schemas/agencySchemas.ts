import { z } from 'zod';

export const createAgencySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  contactInfo: z.string().optional(),
});

export type CreateAgencySchema = z.infer<typeof createAgencySchema>;

