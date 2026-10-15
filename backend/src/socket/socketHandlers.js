const mongoose = require("mongoose");
const Presence = require("../models/Presence");

function registerSocketHandlers(io) {
  // In-memory state for low-latency live position broadcasts (Week 1 architecture)
  const users = new Map();

  // Valid office identifiers
  const isValidOfficeId = (id) => typeof id === "string" && id.trim().length > 0;

  io.on("connection", (socket) => {
    console.log("[Socket] User connected:", socket.id);

    socket.on("user:join", (data) => {
      const { userId, officeId, x = 0, y = 0 } = data || {};

      if (
        typeof userId !== "string" ||
        !userId.trim() ||
        !isValidOfficeId(officeId)
      ) {
        socket.emit("error:bad_request", { message: "Invalid userId or officeId" });
        return;
      }

      // Prevent one socket from joining multiple identities
      if (socket.data.userId) {
        return;
      }

      socket.data.userId = userId;
      socket.data.officeId = officeId;

      socket.join(officeId);

      const existingUsers = Array.from(users.values())
        .filter((user) => user.officeId === officeId);

      socket.emit("presence:update", existingUsers);

      // Register this user's initial position in-memory
      const initialX = Number.isFinite(x) ? Math.max(0, Math.min(800, x)) : 0;
      const initialY = Number.isFinite(y) ? Math.max(0, Math.min(500, y)) : 0;

      const user = {
        userId,
        officeId,
        x: initialX,
        y: initialY
      };

      users.set(userId, user);

      // Broadcast new user to all others in the office
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

      if (
        userId !== socket.data.userId ||
        officeId !== socket.data.officeId ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 || x > 800 ||
        y < 0 || y > 500
      ) {
        socket.emit("error:invalid_coordinates", {
          message: "Rejected: Coordinates must be numeric with 0 <= x <= 800 and 0 <= y <= 500",
          received: { x, y }
        });
        return;
      }

      const existingUser = users.get(userId);
      if (!existingUser || existingUser.officeId !== officeId) {
        return;
      }

      // In-memory update for fast 60fps real-time broadcast (Zero DB write per movement tick)
      const user = { userId, officeId, x, y };
      users.set(userId, user);

      socket.to(officeId).emit("presence:update", [user]);
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      const officeId = socket.data.officeId;

      if (userId && users.has(userId)) {
        const user = users.get(userId);

        if (user.officeId === officeId) {
          users.delete(userId);

          socket.to(officeId).emit("user:left", {
            userId
          });

          // Persistence strategy: Update MongoDB presence status asynchronously
          if (mongoose.connection.readyState === 1) {
            Presence.findOneAndUpdate(
              { userId, officeId },
              { isOnline: false, lastSeen: new Date(), x: user.x, y: user.y }
            ).catch((err) => {
              console.error("[MongoDB] Non-blocking disconnect persistence log:", err.message);
            });
          }
        }
      }

      console.log("[Socket] User disconnected:", socket.id);
    });
  });
}

module.exports = registerSocketHandlers;
