import { Router } from "express";
import { z } from "zod";
import { createDeliveryRequestFromOrder, createPickupDeliveryRequest, getAllPickupDeliveryRequests, getPickupDeliveryRequestById, receivePickupDeliveryRequest, trackPickupDeliveryRequest, updatePickupDeliveryRequestStatus, } from "../controllers/pickupDeliveryController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import { pickupDeliveryCreateSchema, pickupDeliveryStatusUpdateSchema, pickupDeliveryTrackingSchema, } from "../schemas/pickupDeliverySchema.js";
const router = Router();
const receivePickupDeliverySchema = z.object({
    quantity: z.number().finite().positive(),
});
const deliveryRequestFromOrderSchema = z.object({
    orderCode: z.string().trim().min(1),
    phone: z.string().trim().min(1),
    address: z.string().trim().min(1).max(500),
});
router.post("/track", validateBody(pickupDeliveryTrackingSchema), trackPickupDeliveryRequest);
router.get("/", authenticate, authorize("ADMIN", "STAFF"), getAllPickupDeliveryRequests);
router.get("/:id", authenticate, authorize("ADMIN", "STAFF"), getPickupDeliveryRequestById);
router.post("/", validateBody(pickupDeliveryCreateSchema), createPickupDeliveryRequest);
router.post("/delivery-from-order", validateBody(deliveryRequestFromOrderSchema), createDeliveryRequestFromOrder);
router.patch("/:id/status", authenticate, authorize("ADMIN", "STAFF"), validateBody(pickupDeliveryStatusUpdateSchema), updatePickupDeliveryRequestStatus);
router.post("/:id/receive", authenticate, authorize("ADMIN", "STAFF"), validateBody(receivePickupDeliverySchema), receivePickupDeliveryRequest);
export default router;
