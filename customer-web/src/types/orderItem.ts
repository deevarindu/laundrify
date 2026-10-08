import type { Order } from "./order";
import type { Service } from "./service";

export type OrderItem = {
  id: number;
  orderId: number;
  serviceId: number;
  quantity: number;
  priceSnapshoot: number | string;
  subtotal: number | string;
  createdAt: string;
  updatedAt: string;
}

export type OrderItemWithRelations = OrderItem & {
  order: Order;
  service: Service;
}