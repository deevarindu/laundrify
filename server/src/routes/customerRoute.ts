import { Router } from "express";
import { getCustomerById, createCustomer, getAllCustomers, updateCustomer, deleteCustomer } from "../controllers/customerController.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), getAllCustomers);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getCustomerById);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), createCustomer);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), updateCustomer);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteCustomer);

export default router;