let io;
export const setSocketIO = (socketServer) => {
    io = socketServer;
};
export const getSocketIO = () => {
    if (!io) {
        throw new Error("Socket.IO has not been initialized.");
    }
    return io;
};
