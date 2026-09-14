import { Router } from "express";
import { createPayment, deletePayment, getAllPayments, getPaymentById, updatePayment } from "../controllers/paymentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), getAllPayments);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getPaymentById);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), createPayment);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), updatePayment);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deletePayment);

export default router;