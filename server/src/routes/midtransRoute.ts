import { Router } from "express";
import { z } from "zod";
import {
  checkCustomerMidtransStatus,
  createCustomerMidtransTransaction,
  createMidtransTransaction,
  handleMidtransNotification,
} from "../controllers/midtransController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const createMidtransTransactionSchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

const customerPaymentSchema = z.object({
  orderCode: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(30),
});

router.post(
  "/create",
  authenticate,
  authorize("ADMIN", "STAFF"),
  validateBody(createMidtransTransactionSchema),
  createMidtransTransaction
);

router.post(
  "/customer/create",
  validateBody(customerPaymentSchema),
  createCustomerMidtransTransaction
);

router.post(
  "/customer/status",
  validateBody(customerPaymentSchema),
  checkCustomerMidtransStatus
);

router.post("/notification", handleMidtransNotification);

export default router;
