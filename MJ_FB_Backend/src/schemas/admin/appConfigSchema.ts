import { z } from 'zod';

export const appConfigSchema = z.object({
  cartTare: z.coerce.number().min(0),
});

export type AppConfigInput = z.infer<typeof appConfigSchema>;
