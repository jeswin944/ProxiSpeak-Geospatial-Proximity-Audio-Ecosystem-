
function registerSocketHandlers(io) {
  // Temporary in-memory state
  const users = new Map();

  // Valid office IDs for testing
  const validOffices = new Set(["office_1"]);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user:join", (data) => {
      const { userId, officeId } = data || {};

      if (
        typeof userId !== "string" ||
        !userId.trim() ||
        typeof officeId !== "string" ||
        !validOffices.has(officeId)
      ) {
        return;
      }

      // Prevent one socket from joining multiple identities
      if (socket.data.userId) {
        return;
      }

      // Prevent duplicate user IDs from overwriting another
      // connected user's position
      if (users.has(userId)) {
        return;
      }

      socket.data.userId = userId;
      socket.data.officeId = officeId;

      socket.join(officeId);

      const existingUsers = Array.from(users.values())
        .filter((user) => user.officeId === officeId);

      socket.emit("presence:update", existingUsers);

      // Register this user's initial position
      const user = {
        userId,
        officeId,
        x: 0,
        y: 0
      };

      users.set(userId, user);

      socket.to(officeId).emit("presence:update", [user]);
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
        return;
      }

      const existingUser = users.get(userId);

      if (!existingUser || existingUser.officeId !== officeId) {
        return;
      }

      const user = { userId, officeId, x, y };

      users.set(userId, user);

      socket.to(officeId).emit("presence:update", [user]);
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      const officeId = socket.data.officeId;

      if (userId && users.get(userId)) {
        const user = users.get(userId);

        if (user.officeId === officeId) {
          users.delete(userId);

          socket.to(officeId).emit("user:left", {
            userId
          });
        }
      }

      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = registerSocketHandlers;
