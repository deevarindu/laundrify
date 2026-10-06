import { getSocketIO } from "./socket.js";
export const emitNewPickupDeliveryRequest = (request) => {
    getSocketIO().emit("pickup_delivery:new", request);
};
export const emitOrderStatusChanged = (order) => {
    getSocketIO().emit("order:status_changed", order);
};
export const emitPaymentStatusChanged = (payment) => {
    getSocketIO().emit("payment:status_changed", payment);
};
