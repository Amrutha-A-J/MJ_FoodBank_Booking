import { z } from 'zod';

// Schema for the login endpoint. Requires a password and either
// an email or a clientId (but not both).
export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    clientId: z.coerce.number().int().positive().optional(),
    password: z.string().min(1),
  })
  .refine(data => data.email || data.clientId, {
    message: 'Email or clientId is required',
    path: ['email'],
  })
  .refine(data => !(data.email && data.clientId), {
    message: 'Provide either email or clientId, not both',
    path: ['email'],
  });

// Schema for creating a user. Validates all required fields and
// basic constraints like clientId range and role values.
export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  clientId: z.coerce.number().int().min(1).max(9_999_999),
  role: z.enum(['shopper', 'delivery']),
  password: z.string().min(1),
});

