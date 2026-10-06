import { getSocketIO } from "./socket.js";

export const emitNewPickupDeliveryRequest = (request: unknown) => {
  getSocketIO().emit("pickup_delivery:new", request);
};

export const emitOrderStatusChanged = (order: unknown) => {
  getSocketIO().emit("order:status_changed", order);
};

export const emitPaymentStatusChanged = (payment: unknown) => {
  getSocketIO().emit("payment:status_changed", payment);
};