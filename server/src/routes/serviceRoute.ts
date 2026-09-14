import { Router } from "express";
import { getServiceById, createService, getAllServices, updateService, deleteService } from "../controllers/serviceController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), getAllServices);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getServiceById);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), createService);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), updateService);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteService);

export default router;