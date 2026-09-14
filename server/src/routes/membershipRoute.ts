import { Router } from "express";
import { createMembership, deleteMembership, getAllMemberships, getMembershipById, updateMembership,} from "../controllers/membershipController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), getAllMemberships);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getMembershipById);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), createMembership);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), updateMembership);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteMembership);

export default router;