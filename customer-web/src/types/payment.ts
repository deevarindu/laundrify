import type { Order } from "./order";

export type PaymentMethod = 
  | "CASH"
  | "TRANSFER"
  | "QRIS"

export type Payment = {
  id: number;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  receivedById: number | null;
}

export type PaymentWithRelations = Payment & {
  order: Order;
  payment: Payment;
}