import { z } from 'zod';
import { passwordSchema } from '../../utils/passwordUtils';

export const createVolunteerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    roleIds: z.array(z.number().int().positive()).nonempty(),
    onlineAccess: z.boolean().optional(),
    password: passwordSchema.optional(),
    sendPasswordLink: z.boolean().optional(),
  })
  .refine(data => !data.onlineAccess || !!data.email, {
    message: 'Email required for online account',
    path: ['email'],
  })
  .refine(data => !(data.password && data.sendPasswordLink), {
    message: 'Cannot provide password and sendPasswordLink',
    path: ['password'],
  })
  .refine(data => !data.password || !!data.email, {
    message: 'Email required when providing password',
    path: ['email'],
  })
  .refine(data => !data.sendPasswordLink || !!data.email, {
    message: 'Email required to send password link',
    path: ['email'],
  });
