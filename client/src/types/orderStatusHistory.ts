import type { OrderStatus } from "./order";

import type { User } from "./user";

export type OrderStatusHistory = {
  id: number;
  orderId: number;
  orderStatus: OrderStatus;
  changedById: number;
  changedAt: string;
  note: string | null;
};

export type OrderStatusHistoryWithUser =
  OrderStatusHistory & {
    user: User;
  };