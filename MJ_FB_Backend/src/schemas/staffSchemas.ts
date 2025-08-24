import { z } from 'zod';

export const staffAccessEnum = z.enum(['pantry','volunteer_management','warehouse','admin']);

export const createStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  access: z.array(staffAccessEnum).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
