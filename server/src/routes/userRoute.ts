import { Router } from "express";
import { getUserById, createUser, getAllUsers, updateUser, deleteUser } from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { userQuerySchema, userCreateSchema, userUpdateSchema } from "../schemas/userSchema.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN"), validateQuery(userQuerySchema), getAllUsers);
router.get('/:id', authenticate, authorize("ADMIN"), getUserById);
router.post('/', authenticate, authorize("ADMIN"), validateBody(userCreateSchema), createUser);
router.patch('/:id', authenticate, authorize("ADMIN"), validateBody(userUpdateSchema), updateUser);
router.delete('/:id', authenticate, authorize("ADMIN"), deleteUser);

export default router;