import { Router } from "express";
import { getServiceById, createService, getAllServices, updateService, deleteService } from "../controllers/serviceController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { serviceCreateSchema, serviceUpdateSchema, serviceQuerySchema } from "../schemas/serviceSchema.js";

const router = Router();

router.get("/", authenticate, authorize("ADMIN", "STAFF"), validateQuery(serviceQuerySchema), getAllServices);
router.get("/:id", authenticate, authorize("ADMIN", "STAFF"), getServiceById);
router.post("/", authenticate, authorize("ADMIN"), validateBody(serviceCreateSchema), createService);
router.patch("/:id", authenticate, authorize("ADMIN"), validateBody(serviceUpdateSchema), updateService);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteService);

export default router;