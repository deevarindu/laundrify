import { Router } from "express";
import { createOrderItem, updateOrderItem, deleteOrderItem,} from "../controllers/orderItemController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

router.post('/', authenticate, authorize("ADMIN", "STAFF"), createOrderItem);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), updateOrderItem);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteOrderItem);

export default router;