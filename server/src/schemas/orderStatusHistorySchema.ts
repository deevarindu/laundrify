import { z } from "zod";

export const orderStatusHistoryQuerySchema = z.object({
  orderId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  status: z
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
  changedById: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
});