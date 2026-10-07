import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import { createMidtransTransaction, handleMidtransNotification } from "../controllers/midtransController.js";

const router = Router();

const createMidtransTransactionSchema = z.object({
  orderId: z.coerce.number().int().positive()
})

router.post('/create', authenticate,authorize("ADMIN", "STAFF"), validateBody(createMidtransTransactionSchema), createMidtransTransaction);
router.post('/notification', handleMidtransNotification);

export default router;