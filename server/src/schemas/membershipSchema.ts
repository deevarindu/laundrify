import { z } from "zod";

export const membershipCreateSchema = z.object({
  customerId: z.coerce
    .number()
    .int()
    .positive("Invalid customer ID."),
  discountPercent: z.coerce
    .number()
    .min(0, "Discount percent cannot be negative.")
    .max(100, "Discount percent cannot exceed 100.")
    .optional(),
});

export const membershipUpdateSchema =
  membershipCreateSchema.extend({
    isActive: z.boolean().optional(),
  }).partial();

export const membershipQuerySchema = z.object({
  q: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});