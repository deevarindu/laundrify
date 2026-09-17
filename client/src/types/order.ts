import type { Customer } from "./customer";
import type { OrderItemWithService } from "./orderItem";
import type { PaymentWithReceiver } from "./payment";
import type { User } from "./user";
import type { OrderStatusHistoryWithUser } from "./orderStatusHistory";

export type PaymentStatus =
  | "BELUM_DIBAYAR"
  | "SUDAH_DIBAYAR";

export type OrderStatus =
  | "PESANAN_DITERIMA"
  | "DICUCI"
  | "DIKERINGKAN"
  | "DISETRIKA"
  | "SIAP_DIAMBIL"
  | "SELESAI"
  | "DIBATALKAN";

export type Order = {
  id: number;
  orderCode: string;
  customerId: number;
  createdById: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderWithRelations = Order & {
  customer: Customer;
  user: User;
  orderItems: OrderItemWithService[];
  payment: PaymentWithReceiver | null;
  orderStatusHistories: OrderStatusHistoryWithUser[];
};