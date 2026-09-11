import { Router } from "express";
import { createOrderItem, deleteOrderItem, updateOrderItem } from "../controllers/orderItemController.js";

const router = Router();

router.post('/', createOrderItem);
router.patch('/:id', updateOrderItem);
router.delete('/:id', deleteOrderItem);

export default router;