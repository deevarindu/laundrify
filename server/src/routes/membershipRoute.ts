import { Router } from "express";
import { createMembership, deleteMembership, getAllMemberships, getMembershipById, updateMembership,} from "../controllers/membershipController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { membershipCreateSchema, membershipUpdateSchema, membershipQuerySchema } from "../schemas/membershipSchema.js";

const router = Router();

router.get('/', authenticate, authorize("ADMIN", "STAFF"), validateQuery(membershipQuerySchema), getAllMemberships);
router.get('/:id', authenticate, authorize("ADMIN", "STAFF"), getMembershipById);
router.post('/', authenticate, authorize("ADMIN", "STAFF"), validateBody(membershipCreateSchema), createMembership);
router.patch('/:id', authenticate, authorize("ADMIN", "STAFF"), validateBody(membershipUpdateSchema), updateMembership);
router.delete('/:id', authenticate, authorize("ADMIN", "STAFF"), deleteMembership);

export default router;