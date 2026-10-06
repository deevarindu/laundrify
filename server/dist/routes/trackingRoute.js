import { Router } from "express";
import { trackOrder } from "../controllers/trackingController.js";
import { validateBody } from "../middleware/validate.js";
import { publicTrackingSchema } from "../schemas/trackingSchema.js";
const router = Router();
router.post("/", validateBody(publicTrackingSchema), trackOrder);
export default router;
