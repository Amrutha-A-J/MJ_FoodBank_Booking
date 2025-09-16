import { z } from 'zod';
import { passwordSchema } from '../utils/passwordUtils';

// Schema for the /auth/login endpoint. Requires a password and either
// an email or a clientId (but not both).
export const authLoginSchema = z
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
export const createUserSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    clientId: z.coerce.number().int().min(1).max(9_999_999),
    role: z.enum(['shopper', 'delivery']),
    onlineAccess: z.boolean(),
    password: passwordSchema.optional(),
    sendPasswordLink: z.boolean().optional(),
  })
  .refine(
    data =>
      !data.onlineAccess ||
      (!!data.firstName && !!data.lastName && !!data.email),
    {
      message: 'firstName, lastName, and email required for online access',
      path: ['onlineAccess'],
    },
  );

// Schema for updating a user's basic information. First and last names are
// required while email and phone are optional.
export const updateUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  onlineAccess: z.boolean().optional(),
  password: passwordSchema.optional(),
});

// Schema for users updating their own contact information. At least one of
// email, phone, or address must be provided, but all fields remain optional
// individually.
export const updateMyProfileSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  })
  .refine(
    data =>
      data.email !== undefined ||
      data.phone !== undefined ||
      data.address !== undefined,
    {
      message: 'email, phone, or address required',
      path: ['email'],
  });



export const updatePreferencesSchema = z.object({
  emailReminders: z.boolean(),
});

