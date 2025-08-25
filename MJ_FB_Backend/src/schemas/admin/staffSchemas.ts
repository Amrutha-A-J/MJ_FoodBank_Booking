import { z } from 'zod';
import { passwordSchema } from '../../utils/passwordUtils';

export const staffAccessEnum = z.enum(['pantry','volunteer_management','warehouse','admin']);

export const createStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: passwordSchema,
  access: z.array(staffAccessEnum).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema.extend({
  password: passwordSchema.optional(),
  access: z.array(staffAccessEnum),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
