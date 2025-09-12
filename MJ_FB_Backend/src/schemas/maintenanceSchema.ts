import { z } from 'zod';

export const maintenanceSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  notice: z.string().optional(),
});

export type MaintenancePayload = z.infer<typeof maintenanceSchema>;
