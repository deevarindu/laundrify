import { Router } from "express";
import { getUserById, createUser, getAllUsers, updateUser, deleteUser } from "../controllers/userController.js";

const router = Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser)

export default router;