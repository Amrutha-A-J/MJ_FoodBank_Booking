import { z } from 'zod';

export const addOutgoingReceiverSchema = z.object({
  name: z.string().min(1),
});

export type AddOutgoingReceiverSchema = z.infer<typeof addOutgoingReceiverSchema>;
