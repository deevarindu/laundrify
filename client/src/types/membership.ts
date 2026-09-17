export type Membership = {
  id: number;
  customerId: number;
  memberCode: string;
  discountPercent: number | string;
  isActive: boolean;
  joinedAt: string;
  updatedAt: string;
};