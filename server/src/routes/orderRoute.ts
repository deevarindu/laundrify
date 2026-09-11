import { Router } from "express";
import { createOrder, deleteOrder, getAllOrders, getOrderById, updateOrder } from "../controllers/orderControlller.js";

const router = Router();

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.patch('/:id', updateOrder);
router.delete('/:id', deleteOrder);

export default router;