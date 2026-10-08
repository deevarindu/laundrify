import type { Order } from "./order";
import type { OrderStatusHistory } from "./orderStatusHistory";
import type { Payment } from "./payment";
import type { PickupDelivery } from "./pickupDelivery";

export type Role = 
| "ADMIN"
| "STAFF"

export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: string;
  createdAt: string;
  updatedAt: string;
}

export type UserWithRelations = User & {
  orders: Order[];
  orderStatusHistories: OrderStatusHistory[];
  paymentsReceived: Payment[];
  pickupDeliveryRequests: PickupDelivery[];
}