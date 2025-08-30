import { z } from 'zod';
import { passwordSchema } from '../utils/passwordUtils';

export const createAgencySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  contactInfo: z.string().optional(),
  password: passwordSchema.optional(),
});

export type CreateAgencySchema = z.infer<typeof createAgencySchema>;

