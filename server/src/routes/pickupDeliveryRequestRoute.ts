import { Router } from "express";
import { createPickupDeliveryRequest, deletePickupDeliveryRequest, getAllPickupDeliveryRequests, getPickupDeliveryRequestById, updatePickupDeliveryRequest } from "../controllers/pickupDeliveryRequestController.js";

const router = Router();

router.get('/', getAllPickupDeliveryRequests);
router.get('/:id', getPickupDeliveryRequestById);
router.post('/', createPickupDeliveryRequest);
router.patch('/:id', updatePickupDeliveryRequest);
router.delete('/:id', deletePickupDeliveryRequest);

export default router;