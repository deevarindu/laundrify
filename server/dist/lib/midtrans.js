import midtransClient from "midtrans-client";
const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY is not defined.");
}
if (!clientKey) {
    throw new Error("MIDTRANS_CLIENT_KEY is not defined.");
}
const snap = new midtransClient.Snap({
    isProduction,
    serverKey,
    clientKey,
});
export default snap;
