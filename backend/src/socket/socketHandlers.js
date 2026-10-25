const mongoose = require("mongoose");
const Presence = require("../models/Presence");

// Office boundary configurations (can be extended per office)
const OFFICE_BOUNDARIES = {
  office_1: { minX: 0, maxX: 800, minY: 0, maxY: 500 },
  office_2: { minX: 0, maxX: 800, minY: 0, maxY: 500 },
  default: { minX: 0, maxX: 800, minY: 0, maxY: 500 }
};

function getOfficeBounds(officeId) {
  return OFFICE_BOUNDARIES[officeId] || OFFICE_BOUNDARIES.default;
}

function registerSocketHandlers(io) {
  // In-memory state for low-latency live position broadcasts (60fps)
  const users = new Map();

  const isValidOfficeId = (id) => typeof id === "string" && id.trim().length > 0;

  // DB write executor with in-flight queue management
  function executeDbSave(user, targetX, targetY, isOnline = true) {
    if (mongoose.connection.readyState !== 1) return;

    user.isSaving = true;
    user.lastDbSave = Date.now();

    Presence.findOneAndUpdate(
      { userId: user.userId, officeId: user.officeId },
      { $set: { x: targetX, y: targetY, isOnline, lastSeen: new Date() } },
      { upsert: true, new: true, runValidators: true }
    )
      .then((doc) => {
        if (doc) {
          console.log(
            `[MongoDB] Position persisted: ${user.userId} -> (${Math.round(targetX)}, ${Math.round(targetY)}) [online: ${isOnline}]`
          );
        } else {
          console.warn(`[MongoDB] No document matched/returned for ${user.userId}`);
        }
      })
      .catch((err) => {
        // Sanitize error logging to prevent leaking credentials
        console.error("[MongoDB] Movement persistence error:", err.message);
      })
      .finally(() => {
        user.isSaving = false;

        // If user disconnected while a write was in-flight, flush the offline record
        if (user.pendingDisconnect) {
          user.pendingDisconnect = false;
          executeDbSave(user, user.x, user.y, false);
          return;
        }

        // If a newer coordinate arrived while a write was in-flight, flush the latest position
        if (user.pendingCoords) {
          const next = user.pendingCoords;
          user.pendingCoords = null;
          executeDbSave(user, next.x, next.y, true);
        }
      });
  }

  // Throttled persistence scheduler (500ms throttle with trailing debounce)
  function schedulePersistence(user) {
    if (mongoose.connection.readyState !== 1) return;

    const THROTTLE_MS = 500;
    const now = Date.now();
    const elapsed = now - (user.lastDbSave || 0);

    if (user.isSaving) {
      // In-flight write in progress: record latest coordinates to flush upon completion
      user.pendingCoords = { x: user.x, y: user.y };
      return;
    }

    if (elapsed >= THROTTLE_MS) {
      executeDbSave(user, user.x, user.y, true);
    } else {
      // Within throttle interval: schedule trailing write to guarantee stopping position is saved
      if (!user.trailingSaveTimer) {
        const delay = Math.max(50, THROTTLE_MS - elapsed);
        user.trailingSaveTimer = setTimeout(() => {
          user.trailingSaveTimer = null;
          if (user.isSaving) {
            user.pendingCoords = { x: user.x, y: user.y };
          } else {
            executeDbSave(user, user.x, user.y, true);
          }
        }, delay);
      }
    }
  }

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

      // A single socket cannot join multiple times
      if (socket.data.userId) {
        console.warn("Socket already joined:", socket.id);
        return;
      }

      // Reconnect handling: if user exists from a disconnected/dead socket, allow clean rejoin
      if (users.has(userId)) {
        const existing = users.get(userId);
        const oldSocket = io.sockets.sockets.get(existing.socketId);
        if (oldSocket && oldSocket.connected && oldSocket.id !== socket.id) {
          console.warn("Duplicate active user ID rejected:", userId);
          socket.emit("error:duplicate_user", { message: "User already active in office" });
          return;
        }
        // Clean up previous timer if socket dropped
        if (existing.trailingSaveTimer) {
          clearTimeout(existing.trailingSaveTimer);
        }
        users.delete(userId);
      }

      const bounds = getOfficeBounds(officeId);
      const posX = Number.isFinite(x) ? Math.max(bounds.minX, Math.min(bounds.maxX, x)) : 100;
      const posY = Number.isFinite(y) ? Math.max(bounds.minY, Math.min(bounds.maxY, y)) : 100;

      socket.data.userId = userId;
      socket.data.officeId = officeId;
      socket.join(officeId);

      // Send existing users in this office to the new user
      const existingUsers = Array.from(users.values())
        .filter((user) => user.officeId === officeId);

      socket.emit("presence:update", existingUsers);

      const user = {
        userId,
        officeId,
        socketId: socket.id,
        x: posX,
        y: posY,
        lastDbSave: 0,
        isSaving: false,
        pendingCoords: null,
        pendingDisconnect: false,
        trailingSaveTimer: null
      };

      users.set(userId, user);

      // Notify other users in this office
      socket.to(officeId).emit("presence:update", [user]);

      // Persistence: Upsert Presence in MongoDB Atlas asynchronously
      if (mongoose.connection.readyState === 1) {
        Presence.findOneAndUpdate(
          { userId, officeId },
          { $set: { userId, officeId, x: posX, y: posY, isOnline: true, lastSeen: new Date() } },
          { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        )
          .then((doc) => {
            if (doc) {
              console.log(`[MongoDB] Presence saved for ${userId} in ${officeId} at (${posX}, ${posY})`);
            }
          })
          .catch((err) => {
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

      const bounds = getOfficeBounds(officeId);
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < bounds.minX || x > bounds.maxX ||
        y < bounds.minY || y > bounds.maxY
      ) {
        console.warn("Invalid movement coordinates:", socket.id, { x, y });
        socket.emit("error:invalid_coordinates", {
          message: `Rejected: Coordinates must be numbers with ${bounds.minX} <= x <= ${bounds.maxX} and ${bounds.minY} <= y <= ${bounds.maxY}`,
          received: { x, y }
        });
        return;
      }

      const user = users.get(userId);
      if (!user || user.officeId !== officeId) {
        console.warn("Unknown active user:", socket.id);
        return;
      }

      // In-memory update for instant 60fps real-time broadcast
      user.x = x;
      user.y = y;

      // Broadcast to other clients in the same office
      socket.to(officeId).emit("presence:update", [{
        userId,
        officeId,
        x,
        y
      }]);

      // Schedule write with non-overlapping queue and trailing debounce
      schedulePersistence(user);
    });

    socket.on("disconnect", () => {
      const { userId, officeId } = socket.data || {};

      if (userId && officeId) {
        const user = users.get(userId);

        if (user && user.officeId === officeId) {
          // Clear any pending trailing save timer
          if (user.trailingSaveTimer) {
            clearTimeout(user.trailingSaveTimer);
            user.trailingSaveTimer = null;
          }

          users.delete(userId);
          socket.to(officeId).emit("user:left", { userId });

          // Persistence: Mark offline and persist final coordinates in MongoDB Atlas
          if (mongoose.connection.readyState === 1) {
            if (user.isSaving) {
              // Wait for in-flight write to complete, then save offline
              user.pendingDisconnect = true;
            } else {
              executeDbSave(user, user.x, user.y, false);
            }
          }
        }
      }

      console.log("[Socket] User disconnected:", socket.id);
    });
  });
}

module.exports = registerSocketHandlers;
