const mongoose = require("mongoose");
const Presence = require("../models/Presence");

function registerSocketHandlers(io) {
  const users = new Map();

  // Offices permitted for today's testing
  const validOffices = new Set(["office_1", "office_2"]);

  io.on("connection", (socket) => {
    console.log("[Socket] User connected:", socket.id);

    socket.on("user:join", (data) => {
      const { userId, officeId, x = 0, y = 0 } = data || {};

      if (
        typeof userId !== "string" ||
        !userId.trim() ||
        !isValidOfficeId(officeId)
      ) {
        console.warn("Rejected user:join:", socket.id);
        return;
      }

      // A socket can join only once
      if (socket.data.userId) {
        console.warn("Socket already joined:", socket.id);
        return;
      }

      // Do not let another socket overwrite this user's session
      if (users.has(userId)) {
        console.warn("Duplicate user ID rejected:", userId);
        return;
      }

      socket.data.userId = userId;
      socket.data.officeId = officeId;
      socket.join(officeId);

      // Send current users in this office to the new user
      const existingUsers = Array.from(users.values())
        .filter((user) => user.officeId === officeId);

      socket.emit("presence:update", existingUsers);

      const user = {
  userId,
  officeId,
  x: Number.isFinite(data.x)
    ? Math.max(0, Math.min(776, data.x))
    : 100,
  y: Number.isFinite(data.y)
    ? Math.max(0, Math.min(476, data.y))
    : 100
};

      users.set(userId, user);

      // Notify other users in this office
      socket.to(officeId).emit("presence:update", [user]);

      // Persistence strategy (Week 1): Save to MongoDB asynchronously if connected
      // Non-blocking: will never hold up real-time websocket delivery
      if (mongoose.connection.readyState === 1) {
        Presence.findOneAndUpdate(
          { userId, officeId },
          { userId, officeId, x: initialX, y: initialY, isOnline: true, lastSeen: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).catch((err) => {
          console.error("[MongoDB] Non-blocking join persistence log:", err.message);
        });
      }
    });

    socket.on("avatar:move", (data) => {
      const { userId, officeId, x, y } = data || {};

      if (!socket.data.userId || !socket.data.officeId) {
        console.warn("Movement before joining rejected:", socket.id);
        return;
      }

      if (
        userId !== socket.data.userId ||
        officeId !== socket.data.officeId
      ) {
        console.warn("Movement identity mismatch:", socket.id);
        return;
      }

      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 || x > 800 ||
        y < 0 || y > 500
      ) {
        console.warn("Invalid movement coordinates:", socket.id);
        return;
      }

      const existingUser = users.get(userId);
      if (!existingUser || existingUser.officeId !== officeId) {
        console.warn("Unknown active user:", socket.id);
        return;
      }

      // In-memory update for fast 60fps real-time broadcast (Zero DB write per movement tick)
      const user = { userId, officeId, x, y };
      users.set(userId, user);

      socket.to(officeId).emit("presence:update", [user]);
    });

    socket.on("disconnect", () => {
      const { userId, officeId } = socket.data;

      if (userId && officeId) {
        const user = users.get(userId);

        if (user && user.officeId === officeId) {
          users.delete(userId);

          socket.to(officeId).emit("user:left", { userId });
        }
      }

      console.log("[Socket] User disconnected:", socket.id);
    });
  });
}

module.exports = registerSocketHandlers;
