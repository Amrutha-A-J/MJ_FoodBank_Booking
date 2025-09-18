import { z } from 'zod';

export const donationSchema = z.object({
  date: z.string().min(1),
  donorId: z.number().int(),
  weight: z.number().int(),
});

export const addDonationSchema = donationSchema;
export const updateDonationSchema = donationSchema;

export const manualDonorAggregationSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  donorId: z.number().int(),
  total: z.number().int().optional(),
});

export type DonationSchema = z.infer<typeof donationSchema>;
