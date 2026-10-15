const mongoose = require("mongoose");
const Presence = require("../models/Presence");

function registerSocketHandlers(io) {
  // In-memory state for low-latency live position broadcasts (60fps)
  const users = new Map();

  // Validate office IDs (allows office_1, office_2, office-1, office-main, etc.)
  const isValidOfficeId = (id) => typeof id === "string" && id.trim().length > 0;

  io.on("connection", (socket) => {
    console.log("[Socket] User connected:", socket.id);

    socket.on("user:join", (data) => {
      const { userId, officeId, x = 100, y = 100 } = data || {};

      if (
        typeof userId !== "string" ||
        !userId.trim() ||
        !isValidOfficeId(officeId)
      ) {
        console.warn("Rejected user:join: Invalid userId or officeId", socket.id);
        socket.emit("error:bad_request", { message: "Invalid userId or officeId" });
        return;
      }

      // A socket can join only once
      if (socket.data.userId) {
        console.warn("Socket already joined:", socket.id);
        return;
      }

      // Do not let another socket overwrite this user's active session
      if (users.has(userId)) {
        console.warn("Duplicate user ID rejected:", userId);
        socket.emit("error:duplicate_user", { message: "User already active in office" });
        return;
      }

      socket.data.userId = userId;
      socket.data.officeId = officeId;
      socket.join(officeId);

      // Send existing users in this office to the new user
      const existingUsers = Array.from(users.values())
        .filter((user) => user.officeId === officeId);

      socket.emit("presence:update", existingUsers);

      const posX = Number.isFinite(x) ? Math.max(0, Math.min(800, x)) : 100;
      const posY = Number.isFinite(y) ? Math.max(0, Math.min(500, y)) : 100;

      const user = {
        userId,
        officeId,
        x: posX,
        y: posY,
        lastDbSave: 0 // allow immediate first move save
      };

      users.set(userId, user);

      // Notify other users in this office
      socket.to(officeId).emit("presence:update", [user]);

      // Persistence: Upsert Presence in MongoDB asynchronously
      if (mongoose.connection.readyState === 1) {
        Presence.findOneAndUpdate(
          { userId, officeId },
          { userId, officeId, x: posX, y: posY, isOnline: true, lastSeen: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).then(() => {
          console.log(`[MongoDB] Presence saved for ${userId} in ${officeId} at (${posX}, ${posY})`);
        }).catch((err) => {
          console.error("[MongoDB] Join persistence error:", err.message);
        });
      }
    });

    socket.on("avatar:move", (data) => {
      const { userId, officeId, x, y } = data || {};

      if (!socket.data.userId || !socket.data.officeId) {
        console.warn("Movement before joining rejected:", socket.id);
        socket.emit("error:unauthorized", { message: "Must join an office before moving" });
        return;
      }

      if (
        userId !== socket.data.userId ||
        officeId !== socket.data.officeId
      ) {
        console.warn("Movement identity mismatch:", socket.id);
        socket.emit("error:forbidden", { message: "Identity mismatch" });
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
        console.warn("Invalid movement coordinates:", socket.id, { x, y });
        socket.emit("error:invalid_coordinates", {
          message: "Rejected: Coordinates must be numbers with 0 <= x <= 800 and 0 <= y <= 500",
          received: { x, y }
        });
        return;
      }

      const existingUser = users.get(userId);
      if (!existingUser || existingUser.officeId !== officeId) {
        console.warn("Unknown active user:", socket.id);
        return;
      }

      // In-memory update for instant 60fps real-time broadcast
      existingUser.x = x;
      existingUser.y = y;

      socket.to(officeId).emit("presence:update", [{
        userId,
        officeId,
        x,
        y
      }]);

      // Save position updates to MongoDB Atlas (throttled to at most once every 500ms per user)
      const now = Date.now();
      if (now - (existingUser.lastDbSave || 0) >= 500 && mongoose.connection.readyState === 1) {
        existingUser.lastDbSave = now;
        Presence.findOneAndUpdate(
          { userId, officeId },
          { x, y, lastSeen: new Date() }
        ).then(() => {
          console.log(`[MongoDB] Position updated in Atlas: ${userId} -> (${Math.round(x)}, ${Math.round(y)})`);
        }).catch((err) => {
          console.error("[MongoDB] Movement persistence error:", err.message);
        });
      }
    });

    socket.on("disconnect", () => {
      const { userId, officeId } = socket.data || {};

      if (userId && officeId) {
        const user = users.get(userId);

        if (user && user.officeId === officeId) {
          users.delete(userId);

          socket.to(officeId).emit("user:left", { userId });

          // Persistence: Mark offline and persist final coordinates in MongoDB Atlas
          if (mongoose.connection.readyState === 1) {
            Presence.findOneAndUpdate(
              { userId, officeId },
              { isOnline: false, lastSeen: new Date(), x: user.x, y: user.y }
            ).then(() => {
              console.log(`[MongoDB] Disconnect recorded for ${userId} (offline, final pos: ${Math.round(user.x)}, ${Math.round(user.y)})`);
            }).catch((err) => {
              console.error("[MongoDB] Disconnect persistence error:", err.message);
            });
          }
        }
      }

      console.log("[Socket] User disconnected:", socket.id);
    });
  });
}

module.exports = registerSocketHandlers;
