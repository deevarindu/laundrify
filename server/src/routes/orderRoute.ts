import { Router } from "express";
import { createOrder, deleteOrder, getAllOrders, getOrderById, updateOrder, updateOrderStatus } from "../controllers/orderControlller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), getAllOrders);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), createOrder);
router.patch('/:id/status', authenticate, authorize("ADMIN", "STAFF"), updateOrderStatus);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getOrderById);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), updateOrder);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteOrder);

export default router;