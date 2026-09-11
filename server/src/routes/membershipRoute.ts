import { Router } from "express";
import { createMembership, deleteMembership, getAllMemberships, getMembershipById, updateMembership } from "../controllers/membershipController.js";

const router = Router();

router.get('/', getAllMemberships);
router.get('/:id', getMembershipById);
router.post('/', createMembership);
router.patch('/:id', updateMembership);
router.delete('/', deleteMembership);

export default router;