import {z} from "zod";

export const pickupDeliveryRequestCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required.").regex(/^[0-9+()\-\s]+$/,
      "Invalid phone number."),
  address: z.string().trim().min(1, "Address is required."),
  type: z.enum(["PICKUP", "DELIVERY"]),
});

export const pickupDeliveryRequestUpdateSchema = z.object({
  
})