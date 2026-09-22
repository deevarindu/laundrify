import { Router } from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { validateBody } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../schemas/authSchema.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", authenticate, getMe);

export default router;