import type { Customer } from "./customer";

export type Membership = {
  id: number;
  customerId: number;
  memberCode: string;
  discountPercent: number | string;
  isActive: string;
  joinedAt: string;
  updatedAt: string;
}

export type ServiceWithRelations = {
  customer: Customer;
}