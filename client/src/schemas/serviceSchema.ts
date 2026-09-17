import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Service name is required."),
  category: z.enum(["REGULER", "EKSPRESS", "KHUSUS"]),
  unit: z.enum(["KG", "SATUAN"]),
  price: z
    .number()
    .positive("Price must be greater than 0."),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;