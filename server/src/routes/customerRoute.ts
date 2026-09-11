import { Router } from "express";
import { getCustomerById, createCustomer, getAllCustomers, updateCustomer, deleteCustomer } from "../controllers/customerController.js";

const router = Router();

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.patch('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;