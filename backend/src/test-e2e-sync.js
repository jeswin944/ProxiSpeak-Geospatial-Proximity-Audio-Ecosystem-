require("dotenv").config();

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { io: Client } = require("socket.io-client");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/socketHandlers");
const Presence = require("./models/Presence");

async function runEndToEndDatabaseSyncTest() {
  console.log("================================================================");
  console.log("  ProxiSpeak End-to-End Test: Frontend -> Backend -> MongoDB   ");
  console.log("================================================================\n");

  // Step 1: Connect to live MongoDB Atlas
  console.log("Step 1: Connecting to MongoDB Atlas...");
  await connectDB();
  console.log("✅ MongoDB Atlas connection active.\n");

  // Step 2: Start local backend server
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  registerSocketHandlers(io);

  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  console.log(`Step 2: Server running on port ${port}\n`);

  const testUserId = `e2e-user-${Date.now()}`;
  const testOfficeId = "office_1";

  try {
    // Step 3: Connect client and send user:join
    console.log(`Step 3: Connecting Socket client as ${testUserId}...`);
    const client = Client(`http://localhost:${port}`, { transports: ["websocket"] });
    await new Promise((res) => client.on("connect", res));

    client.emit("user:join", {
      userId: testUserId,
      officeId: testOfficeId,
      x: 120,
      y: 140
    });

    // Wait for database upsert to complete
    await new Promise((r) => setTimeout(r, 600));

    // Step 4: Verify MongoDB contains the joined user
    console.log("Step 4: Querying MongoDB Atlas for user join record...");
    const joinDoc = await Presence.findOne({ userId: testUserId, officeId: testOfficeId });
    if (!joinDoc) {
      throw new Error(`User join was NOT recorded in MongoDB Atlas for ${testUserId}`);
    }
    if (joinDoc.x !== 120 || joinDoc.y !== 140 || joinDoc.isOnline !== true) {
      throw new Error(`Data mismatch on join! Expected (120, 140) online, got (${joinDoc.x}, ${joinDoc.y}) online:${joinDoc.isOnline}`);
    }
    console.log(`✅ Verified in Atlas: ${joinDoc.userId} is online at (${joinDoc.x}, ${joinDoc.y})\n`);

    // Step 5: Send movement coordinates
    console.log("Step 5: Client sends avatar:move to (380, 260)...");
    client.emit("avatar:move", {
      userId: testUserId,
      officeId: testOfficeId,
      x: 380,
      y: 260
    });

    // Wait for throttled DB write
    await new Promise((r) => setTimeout(r, 1200));

    // Step 6: Verify MongoDB Atlas updated the coordinates
    console.log("Step 6: Querying MongoDB Atlas for updated coordinates...");
    const moveDoc = await Presence.findOne({ userId: testUserId, officeId: testOfficeId });
    if (!moveDoc) {
      throw new Error("Presence document missing after movement!");
    }
    if (moveDoc.x !== 380 || moveDoc.y !== 260) {
      throw new Error(`Movement coordinate mismatch in Atlas! Expected (380, 260), got (${moveDoc.x}, ${moveDoc.y})`);
    }
    console.log(`✅ Verified in Atlas: Position updated to (${moveDoc.x}, ${moveDoc.y})\n`);

    // Step 7: Disconnect client and verify offline status in Atlas
    console.log("Step 7: Client disconnects...");
    client.disconnect();

    await new Promise((r) => setTimeout(r, 800));

    const finalDoc = await Presence.findOne({ userId: testUserId, officeId: testOfficeId });
    if (!finalDoc) {
      throw new Error("Presence document missing after disconnect!");
    }
    if (finalDoc.isOnline !== false) {
      throw new Error(`User was not marked offline in Atlas! isOnline is ${finalDoc.isOnline}`);
    }
    console.log(`✅ Verified in Atlas: ${finalDoc.userId} marked isOnline: false (final pos: ${finalDoc.x}, ${finalDoc.y})\n`);

    // Step 8: Clean up test document
    console.log("Step 8: Cleaning up test document from MongoDB Atlas...");
    await Presence.deleteOne({ userId: testUserId });
    console.log("✅ Cleanup complete.\n");

    console.log("================================================================");
    console.log("🎉 ALL END-TO-END DATABASE SYNCHRONIZATION CHECKS PASSED!");
    console.log("================================================================");

  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runEndToEndDatabaseSyncTest().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
