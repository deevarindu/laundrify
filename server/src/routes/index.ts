import { Router } from "express";
import userRoute from "./userRoute.js";
import customerRoute from "./customerRoute.js";
import serviceRoute from "./serviceRoute.js";
import membershipRoute from "./membershipRoute.js";
import orderRoute from "./orderRoute.js";
import paymentRoute from "./paymentRoute.js";
import orderItemRoute from "./orderItemRoute.js";
import orderStatusHistoryRoute from "./orderStatusHistoryRoute.js";
import authRoute from "./authRoute.js";

const router = Router();

router.use('/auth', authRoute);
router.use('/user', userRoute);
router.use('/customer', customerRoute);
router.use('/membership', membershipRoute);
router.use('/service', serviceRoute);
router.use('/order', orderRoute);
router.use('/payment', paymentRoute);
router.use('/order-item', orderItemRoute);
router.use('/order-status-history', orderStatusHistoryRoute);

export default router;