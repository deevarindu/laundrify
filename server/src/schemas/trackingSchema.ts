import { z } from "zod";

export const publicTrackingSchema = z.object({
  orderCode: z
    .string()
    .trim()
    .min(1, "Order code is required."),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+()\-\s]+$/, "Invalid phone number."),
});