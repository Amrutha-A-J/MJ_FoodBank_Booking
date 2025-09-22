import { z } from 'zod';

const donorContactSchema = z.object({
  name: z.string().min(1),
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
  isPetFood: z.boolean().default(false),
});

export const addDonorSchema = donorContactSchema;
export const updateDonorSchema = donorContactSchema;

export type AddDonorSchema = z.infer<typeof addDonorSchema>;
export type UpdateDonorSchema = z.infer<typeof updateDonorSchema>;
