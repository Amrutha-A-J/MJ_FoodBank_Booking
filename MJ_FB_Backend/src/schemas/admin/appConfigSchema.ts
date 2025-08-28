import { z } from 'zod';

export const appConfigSchema = z.object({
  cartTare: z.coerce.number().min(0),
  breadWeightMultiplier: z.coerce.number().min(0),
  cansWeightMultiplier: z.coerce.number().min(0),
});

export type AppConfigInput = z.infer<typeof appConfigSchema>;
