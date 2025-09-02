import { z } from 'zod';

export const leaveEmailSettingsSchema = z.object({
  email: z.string().email(),
});

export type LeaveEmailSettingsInput = z.infer<typeof leaveEmailSettingsSchema>;
