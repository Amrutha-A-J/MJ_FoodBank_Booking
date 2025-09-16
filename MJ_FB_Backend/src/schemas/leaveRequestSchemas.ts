import { z } from "zod";
import { LeaveType } from "../models/leaveRequest";

const isoDateString = z
  .string()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, "Invalid date format");

export const createLeaveRequestSchema = z
  .object({
    startDate: isoDateString,
    endDate: isoDateString,
    type: z.nativeEnum(LeaveType),
    reason: z
      .string()
      .max(1000)
      .optional()
      .nullable(),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
