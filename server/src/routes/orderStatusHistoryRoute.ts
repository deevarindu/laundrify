import { Router } from "express";
import { getAllOrderStatusHistories, getOrderStatusHistoryById } from "../controllers/orderStatusHistoryController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateQuery } from "../middleware/validate.js";
import { orderStatusHistoryQuerySchema } from "../schemas/orderStatusHistorySchema.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), validateQuery(orderStatusHistoryQuerySchema), getAllOrderStatusHistories);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getOrderStatusHistoryById);

export default router;