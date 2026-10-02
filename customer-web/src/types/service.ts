export type ServiceUnit = "KG" | "SATUAN";

export type ServiceCategory =
  | "REGULER"
  | "EKSPRESS"
  | "KHUSUS";

export type Service = {
  id: number;
  name: string;
  category: ServiceCategory;
  unit: ServiceUnit;
  price: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};