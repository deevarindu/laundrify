import { Router } from "express";
import { createOrder, deleteOrder, getAllOrders, getOrderById, updateOrder, updateOrderStatus } from "../controllers/orderControlller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { orderCreateSchema, orderUpdateSchema, orderStatusSchema, orderQuerySchema } from "../schemas/orderSchema.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), validateQuery(orderQuerySchema), getAllOrders);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), validateBody(orderCreateSchema), createOrder);
router.patch('/:id/status', authenticate, authorize("ADMIN", "STAFF"), validateBody(orderStatusSchema), updateOrderStatus);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getOrderById);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), updateOrder);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteOrder);

export default router;