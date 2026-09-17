import { z } from "zod";

const orderItemSchema = z.object({
  serviceId: z.coerce
    .number()
    .int()
    .positive("Invalid service ID."),
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than 0."),
});

const dueAtSchema = z.preprocess(
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
);

export const orderCreateSchema = z.object({
  customerId: z.coerce
    .number()
    .int()
    .positive("Invalid customer ID."),
  items: z
    .array(orderItemSchema)
    .min(
      1,
      "Order must contain at least one item."
    ),
  dueAt: dueAtSchema,
});

export const orderUpdateSchema = z.object({
  customerId: z.coerce
    .number()
    .int()
    .positive("Invalid customer ID.")
    .optional(),
  dueAt: z.preprocess(
    (value) => {
      if (value === null || value === "") {
        return null;
      }

      if (value === undefined) {
        return undefined;
      }

      return value;
    },
    z.coerce.date().nullable().optional()
  ),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "PESANAN_DITERIMA",
    "DICUCI",
    "DIKERINGKAN",
    "DISETRIKA",
    "SIAP_DIAMBIL",
    "SELESAI",
    "DIBATALKAN",
  ]),
  note: z
    .string()
    .trim()
    .max(500, "Note is too long.")
    .optional()
    .nullable(),
});

export const orderQuerySchema = z.object({
  q: z.string().trim().optional(),
  orderStatus: z
    .enum([
      "PESANAN_DITERIMA",
      "DICUCI",
      "DIKERINGKAN",
      "DISETRIKA",
      "SIAP_DIAMBIL",
      "SELESAI",
      "DIBATALKAN",
    ])
    .optional(),
  paymentStatus: z
    .enum(["BELUM_DIBAYAR", "SUDAH_DIBAYAR"])
    .optional(),
});