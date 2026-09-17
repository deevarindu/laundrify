import { z } from "zod";

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .regex(/^[0-9+()\-\s]+$/, "Invalid phone number."),
  address: z
    .string()
    .trim()
    .optional(),
});

export const membershipSchema = z.object({
  customerId: z.number().int().positive(),
  discountPercent: z
    .number()
    .min(0, "Discount cannot be negative.")
    .max(100, "Discount cannot exceed 100."),
});