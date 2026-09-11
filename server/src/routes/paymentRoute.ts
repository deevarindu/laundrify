import { Router } from "express";
import { createPayment, deletePayment, getAllPayments, getPaymentById, updatePayment } from "../controllers/paymentController.js";

const router = Router();

router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', createPayment);
router.patch('/:id', updatePayment);
router.delete('/:id', deletePayment)

export default router;