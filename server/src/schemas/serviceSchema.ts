import { z } from "zod";

export const serviceCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Service name is required."),
  category: z.enum([
    "REGULER",
    "EKSPRESS",
    "KHUSUS",
  ]),
  unit: z.enum(["KG", "SATUAN"]),
  price: z.coerce
    .number()
    .positive("Price must be greater than 0."),
  isActive: z.boolean().optional(),
});

export const serviceUpdateSchema =
  serviceCreateSchema.partial();

export const serviceQuerySchema = z.object({
  q: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  category: z
    .enum(["REGULER", "EKSPRESS", "KHUSUS"])
    .optional(),
});