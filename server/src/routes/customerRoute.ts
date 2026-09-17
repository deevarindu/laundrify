import { Router } from "express";
import { getCustomerById, createCustomer, getAllCustomers, updateCustomer, deleteCustomer } from "../controllers/customerController.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { customerCreateSchema, customerUpdateSchema, customerQuerySchema } from "../schemas/customerSchema.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), validateQuery(customerQuerySchema), getAllCustomers);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getCustomerById);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), validateBody(customerCreateSchema), createCustomer);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), validateBody(customerUpdateSchema), updateCustomer);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteCustomer);

export default router;