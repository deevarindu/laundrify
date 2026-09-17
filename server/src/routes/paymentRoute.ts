import { Router } from "express";
import { createPayment, deletePayment, getAllPayments, getPaymentById, updatePayment } from "../controllers/paymentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import { paymentCreateSchema, paymentUpdateSchema } from "../schemas/paymentSchema.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), getAllPayments);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getPaymentById);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), validateBody(paymentCreateSchema), createPayment);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), validateBody(paymentUpdateSchema), updatePayment);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deletePayment);

export default router;