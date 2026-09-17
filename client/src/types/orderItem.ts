import type { Service } from "./service";

export type OrderItem = {
  id: number;
  orderId: number;
  serviceId: number;
  quantity: number;
  priceSnapshot: number | string;
  subtotal: number | string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemWithService = OrderItem & {
  service: Service;
};