import { z } from "zod";

export const orderItemCreateSchema = z.object({
  orderId: z.coerce
    .number()
    .int()
    .positive("Invalid order ID."),
  serviceId: z.coerce
    .number()
    .int()
    .positive("Invalid service ID."),
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than 0."),
});

export const orderItemUpdateSchema = z
  .object({
    serviceId: z.coerce
      .number()
      .int()
      .positive("Invalid service ID.")
      .optional(),
    quantity: z.coerce
      .number()
      .positive("Quantity must be greater than 0.")
      .optional(),
  })
  .refine(
    (data) =>
      data.serviceId !== undefined ||
      data.quantity !== undefined,
    {
      message: "No fields to update.",
    }
  );