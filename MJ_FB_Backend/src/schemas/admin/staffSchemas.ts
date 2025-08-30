import { z } from 'zod';

export const staffAccessEnum = z.enum(['pantry','volunteer_management','warehouse','admin']);

export const createStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  access: z.array(staffAccessEnum).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema.extend({
  password: z.string().min(1).optional(),
  access: z.array(staffAccessEnum),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
