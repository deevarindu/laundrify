import { Router } from "express";
import { createOrderItem, updateOrderItem, deleteOrderItem,} from "../controllers/orderItemController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import { orderItemCreateSchema, orderItemUpdateSchema } from "../schemas/orderItemSchema.js";

const router = Router();

router.post('/', authenticate, authorize("ADMIN", "STAFF"), validateBody(orderItemCreateSchema), createOrderItem);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), validateBody(orderItemUpdateSchema), updateOrderItem);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteOrderItem);

export default router;