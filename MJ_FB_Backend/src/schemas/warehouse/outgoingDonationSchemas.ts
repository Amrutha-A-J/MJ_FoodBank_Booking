import { z } from 'zod';

export const outgoingDonationSchema = z.object({
  date: z.string().min(1),
  receiverId: z.number().int(),
  weight: z.number().int(),
  note: z.string().optional(),
});

export const addOutgoingDonationSchema = outgoingDonationSchema;
export const updateOutgoingDonationSchema = outgoingDonationSchema;

export type OutgoingDonationSchema = z.infer<typeof outgoingDonationSchema>;
