import { z } from 'zod';

export const addMonetaryDonationSchema = z.object({
  date: z.string().min(1),
  amount: z.number().int(),
});

export const updateMonetaryDonationSchema = z.object({
  donorId: z.number().int(),
  date: z.string().min(1),
  amount: z.number().int(),
});

export type AddMonetaryDonationSchema = z.infer<typeof addMonetaryDonationSchema>;
export type UpdateMonetaryDonationSchema = z.infer<typeof updateMonetaryDonationSchema>;
