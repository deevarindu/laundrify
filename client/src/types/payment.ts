import type { User } from "./user";

export type PaymentMethod =
  | "CASH"
  | "TRANSFER"
  | "QRIS";

export type Payment = {
  id: number;
  orderId: number;
  amount: number | string;
  method: PaymentMethod;
  paidAt: string;
  receivedById: number;
};

export type PaymentWithReceiver = Payment & {
  receivedBy: User;
};