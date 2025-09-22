import { z } from 'zod';

export const maintenanceSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  notice: z.string().optional(),
});

export type MaintenancePayload = z.infer<typeof maintenanceSchema>;

export const maintenanceSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  upcomingNotice: z.string().optional(),
});

export type MaintenanceSettingsPayload = z.infer<typeof maintenanceSettingsSchema>;

export const maintenancePurgeSchema = z.object({
  tables: z.array(z.string()).min(1),
  before: z.string(),
});

export type MaintenancePurgePayload = z.infer<typeof maintenancePurgeSchema>;

export const maintenanceCleanupSchema = z.object({
  before: z.string().optional(),
});

export type MaintenanceCleanupPayload = z.infer<typeof maintenanceCleanupSchema>;
