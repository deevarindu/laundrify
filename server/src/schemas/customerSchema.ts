import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .regex(
      /^[0-9+()\-\s]+$/,
      "Invalid phone number."
    ),
  address: z
    .string()
    .trim()
    .max(500, "Address is too long.")
    .optional()
    .nullable(),
});

export const customerUpdateSchema =
  customerCreateSchema.partial();

export const customerQuerySchema = z.object({
  q: z.string().trim().optional(),
});