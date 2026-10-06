import { z } from "zod";

export const pickupDeliveryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name is too long."),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+()\-\s]+$/, "Invalid phone number."),

  address: z
    .string()
    .trim()
    .min(1, "Address is required.")
    .max(500, "Address is too long."),

  type: z.enum(["PICKUP", "DELIVERY"]),
});

export const pickupDeliveryStatusUpdateSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});