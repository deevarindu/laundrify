import { z } from "zod";

export const orderItemSchema = z.object({
  serviceId: z.number().int().positive(),
  quantity: z.number().positive("Quantity must be greater than 0."),
});

export const createOrderSchema = z.object({
  customerId: z.number().int().positive("Customer is required."),
  items: z
    .array(orderItemSchema)
    .min(1, "At least one service item is required."),
  dueAt: z.string().optional(),
});

export type CreateOrderData = z.infer<typeof createOrderSchema>;