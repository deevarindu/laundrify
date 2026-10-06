import { Router } from "express";
import { validate, z } from "zod";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import { createMidtransTransaction } from "../controllers/midtransController.js";
const router = Router();
const createMidtransTransactionSchema = z.object({
    orderId: z.coerce.number().int().positive()
});
router.post('/create', authenticate, authorize("ADMIN", "STAFF"), validateBody(createMidtransTransactionSchema), createMidtransTransaction);
export default router;
