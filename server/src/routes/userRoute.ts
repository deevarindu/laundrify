import { Router } from "express";
import { getUserById, createUser, getAllUsers, updateUser, deleteUser } from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN"), getAllUsers);
router.get('/:id', authenticate, authorize("ADMIN"), getUserById);
router.post('/', authenticate, authorize("ADMIN"), createUser);
router.patch('/:id', authenticate, authorize("ADMIN"), updateUser);
router.delete('/:id', authenticate, authorize("ADMIN"), deleteUser);

export default router;