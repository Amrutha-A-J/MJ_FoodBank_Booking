import { z } from 'zod';

export const clientVisitSchema = z.object({
  date: z.string().min(1),
  clientId: z.number().int().optional(),
  anonymous: z.boolean().optional(),
  weightWithCart: z.number().int(),
  weightWithoutCart: z.number().int(),
  adults: z.number().int().min(0),
  children: z.number().int().min(0),
  petItem: z.number().int().optional(),
  note: z.string().optional(),
});

export const addVisitSchema = clientVisitSchema;
export const updateVisitSchema = clientVisitSchema;

export type ClientVisitSchema = z.infer<typeof clientVisitSchema>;

export const importClientVisitsSchema = z.object({
  date: z.date(),
  familySize: z.string().regex(/^\d+A\d*C?$/),
  weightWithCart: z.number().int().min(0),
  weightWithoutCart: z.number().int().min(0),
  petItem: z.number().int().min(0).optional(),
  clientId: z.number().int().min(1),
});

export type ImportClientVisit = z.infer<typeof importClientVisitsSchema>;
