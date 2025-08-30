import { z } from 'zod';

export const warehouseSettingsSchema = z.object({
  breadWeightMultiplier: z.coerce.number().min(0),
  cansWeightMultiplier: z.coerce.number().min(0),
});

export type WarehouseSettingsInput = z.infer<typeof warehouseSettingsSchema>;
