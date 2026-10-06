import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { getDashboard } from "../controllers/dashboardController.js";

const router = Router();

router.get('/', authenticate,authorize("ADMIN", "STAFF"), getDashboard);

export default router;