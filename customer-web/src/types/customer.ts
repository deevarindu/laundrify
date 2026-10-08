import type { Membership } from "./membership";
import type { Order } from "./order";

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  isActive: string;
  createdAt: string;
  udpatedAt: string;
}

export type CustomerWithRelations = Customer & {
  membership: Membership | null;
  orders: Order[];
}