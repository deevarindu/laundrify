import { Router } from "express";
import { getAllOrderStatusHistories, getOrderStatusHistoryById } from "../controllers/orderStatusHistoryController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), getAllOrderStatusHistories);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getOrderStatusHistoryById);

export default router;