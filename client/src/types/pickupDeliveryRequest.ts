import type { Service } from "./service";

export type PickupDeliveryType =
  | "PICKUP"
  | "DELIVERY";

export type PickupDeliveryStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED";

export type PickupDeliveryRequest = {
  id: number;
  name: string;
  phone: string;
  address: string;
  type: PickupDeliveryType;
  serviceId: number;
  service: Service;
  status: PickupDeliveryStatus;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  processedById: number | null;
  processedBy?: {
    id: number;
    name: string;
    email: string;
    role: "ADMIN" | "STAFF";
  } | null;
};