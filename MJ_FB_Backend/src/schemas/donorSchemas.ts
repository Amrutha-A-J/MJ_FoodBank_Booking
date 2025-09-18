import { z } from 'zod';

const donorContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .nullable(),
  phone: z
    .string()
    .min(1)
    .optional()
    .nullable(),
});

export const addDonorSchema = donorContactSchema;
export const updateDonorSchema = donorContactSchema;

export type AddDonorSchema = z.infer<typeof addDonorSchema>;
export type UpdateDonorSchema = z.infer<typeof updateDonorSchema>;
