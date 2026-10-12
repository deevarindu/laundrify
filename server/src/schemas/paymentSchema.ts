
import { z } from "zod";

export const paymentCreateSchema = z.object({
  orderId: z.coerce
    .number()
    .int()
    .positive("Invalid order ID."),
  amount: z.coerce
    .number()
    .positive("Payment amount must be greater than 0."),
  method: z.enum([
    "CASH",
    "TRANSFER",
    "QRIS",
  ]),
  cashReceived: z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return undefined;
      }

      return value;
    },
    z.coerce.number().positive("Cash received must be greater than 0.").optional()
  ),
  paidAt: z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return undefined;
      }

      return value;
    },
    z.coerce.date().optional()
  ),
});

export const paymentUpdateSchema = z.object({
  method: z.enum([
    "CASH",
    "TRANSFER",
    "QRIS",
  ]).optional(),
  cashReceived: z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return undefined;
      }

      return value;
    },
    z.coerce.number().positive("Cash received must be greater than 0.").optional()
  ),
  paidAt: z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined;
      }

      return value;
    },
    z.coerce.date().optional()
  ),
});
