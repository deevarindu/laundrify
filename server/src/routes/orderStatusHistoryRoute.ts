import { Router } from "express";
import { createOrderStatusHistory, deleteOrderStatusHistory, getAllOrderStatusHistories, getOrderStatusHistoryById, updateOrderStatusHistory } from "../controllers/orderStatusHistoryController.js";

const router = Router()

router.get('/', getAllOrderStatusHistories);
router.get('/:id', getOrderStatusHistoryById);
router.post('/', createOrderStatusHistory);
router.patch('/:id', updateOrderStatusHistory);
router.delete('/:id', deleteOrderStatusHistory);

export default router;