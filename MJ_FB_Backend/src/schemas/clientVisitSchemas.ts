import { z } from 'zod';

export const clientVisitSchema = z.object({
  date: z.string().min(1),
  clientId: z.number().int().optional(),
  anonymous: z.boolean().optional(),
  weightWithCart: z.number().int().min(0).nullable().optional(),
  weightWithoutCart: z.number().int().min(0).nullable().optional(),
  adults: z.number().int().min(0),
  children: z.number().int().min(0),
  petItem: z.number().int().optional(),
  verified: z.boolean().optional(),
  note: z.string().optional(),
});

export const addVisitSchema = clientVisitSchema;
export const updateVisitSchema = clientVisitSchema;

export type ClientVisitSchema = z.infer<typeof clientVisitSchema>;
