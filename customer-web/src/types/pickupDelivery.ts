import type { Service } from "./service";
import type { User } from "./user";

export type PickupDeliveryType = 
  | "PICKUP"
  | "DELIVERY"
;

export type PickupDeliveryStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"

export type PickupDelivery = {
  id: number;
  name: string;
  phone: string;
  address: string;
  type: PickupDeliveryType;
  serviceId: number;
  status: PickupDeliveryStatus;
  createdAt: string;
  updatedAt: string;
  processedAt: string;
  processedById: number;
}

export type PickupDeliveryWithRelations = PickupDelivery & {
  serviceId: Service;
  processedBy: User;
}