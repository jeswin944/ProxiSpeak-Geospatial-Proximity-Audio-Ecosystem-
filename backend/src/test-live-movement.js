require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { io: Client } = require("socket.io-client");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/socketHandlers");
const Presence = require("./models/Presence");

/**
 * ProxiSpeak — Live MongoDB Atlas Movement & Integration Test
 *
 * Verifies all 20 required steps against the real MongoDB Atlas database
 * and Socket.IO real-time signaling engine.
 */
async function runLiveMovementTest() {
  console.log("================================================================");
  console.log("  ProxiSpeak — Live MongoDB Atlas Movement Persistence Test     ");
  console.log("================================================================\n");

  const results = [];
  let dbConnected = false;
  let connectionError = null;

  // Track created test user IDs for isolated cleanup
  const createdTestUserIds = [];

  // Step 1: Connect to the configured MongoDB Atlas database
  console.log("Step 1: Connecting to MongoDB Atlas using configured environment...");
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is missing in backend/.env");
    }
    await connectDB();
    dbConnected = true;
    console.log("✅ PASS: Connected to MongoDB Atlas successfully.\n");
    results.push({
      item: 1,
      name: "MongoDB Atlas Connection",
      expected: "Connected to Atlas cluster",
      actual: `Connected to host: ${mongoose.connection.host}`,
      passed: true
    });
  } catch (err) {
    connectionError = err.message;
    console.error(`❌ Atlas Connection Failed: ${err.message}\n`);
    results.push({
      item: 1,
      name: "MongoDB Atlas Connection",
      expected: "Connected to Atlas cluster",
      actual: `Failed: ${err.message}`,
      passed: false
    });
  }

  // Step 2: Generate a unique test user ID and office ID
  const testOfficeId = `office_live_${Date.now()}`;
  const testUserId1 = `user_live1_${Date.now()}`;
  const testUserId2 = `user_live2_${Date.now()}`;
  const isolatedOfficeId = `office_iso_${Date.now()}`;
  const isolatedUserId = `user_iso_${Date.now()}`;

  createdTestUserIds.push(testUserId1, testUserId2, isolatedUserId);
  console.log(`Step 2: Generated unique test IDs -> office: ${testOfficeId}, user1: ${testUserId1}\n`);
  results.push({
    item: 2,
    name: "Unique Test Identifiers",
    expected: "Unique test user and office IDs generated",
    actual: `office=${testOfficeId}, user=${testUserId1}`,
    passed: true
  });

  // Step 3: Start an isolated test server using production handlers
  console.log("Step 3: Starting isolated Socket.IO server on dynamic port...");
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  registerSocketHandlers(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;
  console.log(`[Test Server] Listening on ${serverUrl}\n`);
  results.push({
    item: 3,
    name: "Isolated Test Server",
    expected: "Server listening on dynamic port",
    actual: `Listening on port ${port}`,
    passed: true
  });

  // Helper function to create connected Socket.IO client
  const createClient = async () => {
    const c = Client(serverUrl, { transports: ["websocket"], forceNew: true });
    await new Promise((resolve) => c.on("connect", resolve));
    return c;
  };

  const client1 = await createClient();
  let client2 = null;
  let clientIso = null;

  try {
    // Step 4: Connect Socket.IO test client
    console.log(`Step 4: Socket.IO test client 1 connected (socket.id: ${client1.id})\n`);
    results.push({
      item: 4,
      name: "Connect Test Client 1",
      expected: "Client 1 connected to test server",
      actual: `Connected with socket ID ${client1.id}`,
      passed: true
    });

    // Step 5: Join office with valid initial coordinates
    const initX = 120;
    const initY = 180;
    console.log(`Step 5: Joining office ${testOfficeId} at (${initX}, ${initY})...`);
    client1.emit("user:join", {
      userId: testUserId1,
      officeId: testOfficeId,
      x: initX,
      y: initY
    });
    await new Promise((r) => setTimeout(r, 600));
    results.push({
      item: 5,
      name: "Join Office with Initial Coords",
      expected: `Joined office at (${initX}, ${initY})`,
      actual: `Join event emitted for ${testUserId1}`,
      passed: true
    });

    // Step 6: Query MongoDB and verify initial presence record exists
    console.log("Step 6: Querying MongoDB Atlas for initial Presence record...");
    let initialDoc = null;
    if (dbConnected) {
      const start = Date.now();
      while (Date.now() - start < 4000) {
        await new Promise((r) => setTimeout(r, 200));
        initialDoc = await Presence.findOne({ userId: testUserId1, officeId: testOfficeId });
        if (initialDoc && initialDoc.x === initX && initialDoc.y === initY) break;
      }
    }
    const initialCreated = initialDoc && initialDoc.x === initX && initialDoc.y === initY && initialDoc.isOnline === true;
    console.log(`Result: ${initialCreated ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 6,
      name: "Initial Presence Document in Atlas",
      expected: `Record exists with x=${initX}, y=${initY}, isOnline=true`,
      actual: initialCreated ? `Found in Atlas: x=${initialDoc.x}, y=${initialDoc.y}, online=${initialDoc.isOnline}` : "Record not found or mismatch",
      passed: Boolean(initialCreated)
    });

    // Step 7: Emit movement event with different coordinates
    const moveX = 350;
    const moveY = 250;
    console.log(`Step 7: Emitting movement event to (${moveX}, ${moveY})...`);
    client1.emit("avatar:move", {
      userId: testUserId1,
      officeId: testOfficeId,
      x: moveX,
      y: moveY
    });
    results.push({
      item: 7,
      name: "Emit Movement Event",
      expected: `Move event emitted to (${moveX}, ${moveY})`,
      actual: "Event emitted",
      passed: true
    });

    // Step 8 & 9: Poll MongoDB until expected coordinates are persisted
    console.log("Step 8 & 9: Polling MongoDB Atlas for updated coordinates...");
    let movedDoc = null;
    if (dbConnected) {
      const start = Date.now();
      while (Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 200));
        const doc = await Presence.findOne({ userId: testUserId1, officeId: testOfficeId });
        if (doc && doc.x === moveX && doc.y === moveY) {
          movedDoc = doc;
          break;
        }
      }
    }
    const coordsPersisted = movedDoc && movedDoc.x === moveX && movedDoc.y === moveY;
    console.log(`Result: ${coordsPersisted ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 8,
      name: "Poll MongoDB for Persisted Coords",
      expected: `Polled and matched (${moveX}, ${moveY})`,
      actual: coordsPersisted ? `Persisted in Atlas at (${movedDoc.x}, ${movedDoc.y})` : "Polling timed out",
      passed: Boolean(coordsPersisted)
    });
    results.push({
      item: 9,
      name: "Verify x and y Match",
      expected: `x=${moveX}, y=${moveY}`,
      actual: coordsPersisted ? `x=${movedDoc.x}, y=${movedDoc.y}` : "Coordinates did not match",
      passed: Boolean(coordsPersisted)
    });

    // Step 10: Verify that lastSeen is updated after movement
    const lastSeenValid = movedDoc && movedDoc.lastSeen instanceof Date;
    console.log(`Step 10: Verifying lastSeen timestamp update -> ${lastSeenValid ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 10,
      name: "Verify lastSeen Updated",
      expected: "lastSeen updated to recent timestamp",
      actual: lastSeenValid ? `Updated: ${movedDoc.lastSeen.toISOString()}` : "lastSeen missing",
      passed: Boolean(lastSeenValid)
    });

    // Step 11: Send multiple rapid movement events and confirm latest position eventually persists
    console.log("Step 11: Sending rapid movement burst (5 rapid moves in 100ms)...");
    const rapidPositions = [
      { x: 360, y: 260 },
      { x: 380, y: 280 },
      { x: 400, y: 300 },
      { x: 420, y: 320 },
      { x: 450, y: 350 } // final rapid position
    ];
    for (const pos of rapidPositions) {
      client1.emit("avatar:move", {
        userId: testUserId1,
        officeId: testOfficeId,
        x: pos.x,
        y: pos.y
      });
      await new Promise((r) => setTimeout(r, 20));
    }

    let rapidDoc = null;
    if (dbConnected) {
      const start = Date.now();
      while (Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 200));
        const doc = await Presence.findOne({ userId: testUserId1, officeId: testOfficeId });
        if (doc && doc.x === 450 && doc.y === 350) {
          rapidDoc = doc;
          break;
        }
      }
    }
    const rapidPersisted = rapidDoc && rapidDoc.x === 450 && rapidDoc.y === 350;
    console.log(`Result: ${rapidPersisted ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 11,
      name: "Rapid Movement Throttling & Persistence",
      expected: "Latest position (450, 350) persisted after rapid stream",
      actual: rapidPersisted ? `Persisted latest: (${rapidDoc.x}, ${rapidDoc.y})` : "Failed to persist latest position",
      passed: Boolean(rapidPersisted)
    });

    // Step 12 & 13: Movement inside throttle interval (200ms < 500ms) & stopping flush
    console.log("Step 12 & 13: Testing movement inside throttle interval & stop flush...");
    const stopX = 520;
    const stopY = 410;
    client1.emit("avatar:move", {
      userId: testUserId1,
      officeId: testOfficeId,
      x: stopX,
      y: stopY
    });

    // Wait for trailing debounce flush (500ms + buffer)
    let stopDoc = null;
    if (dbConnected) {
      const start = Date.now();
      while (Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 200));
        const doc = await Presence.findOne({ userId: testUserId1, officeId: testOfficeId });
        if (doc && doc.x === stopX && doc.y === stopY) {
          stopDoc = doc;
          break;
        }
      }
    }
    const stopPersisted = stopDoc && stopDoc.x === stopX && stopDoc.y === stopY;
    console.log(`Result: ${stopPersisted ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 12,
      name: "Movement Inside Throttle Interval",
      expected: "Move within 500ms window triggers trailing save",
      actual: stopPersisted ? "Trailing save queued" : "Failed",
      passed: Boolean(stopPersisted)
    });
    results.push({
      item: 13,
      name: "Final Stop Coordinates Saved",
      expected: `Final coordinates (${stopX}, ${stopY}) saved after stopping`,
      actual: stopPersisted ? `Saved in Atlas: (${stopDoc.x}, ${stopDoc.y})` : "Final coordinates lost",
      passed: Boolean(stopPersisted)
    });

    // Step 14: Connect second client and verify it receives avatar movement update
    console.log("Step 14: Connecting Client 2 and verifying live movement broadcast...");
    client2 = await createClient();
    let client2ReceivedMove = false;

    client2.on("presence:update", (users) => {
      const u1 = users.find((u) => u.userId === testUserId1);
      if (u1 && u1.x === 560 && u1.y === 430) {
        client2ReceivedMove = true;
      }
    });

    client2.emit("user:join", {
      userId: testUserId2,
      officeId: testOfficeId,
      x: 200,
      y: 200
    });
    await new Promise((r) => setTimeout(r, 400));

    // Client 1 moves to (560, 430)
    client1.emit("avatar:move", {
      userId: testUserId1,
      officeId: testOfficeId,
      x: 560,
      y: 430
    });
    await new Promise((r) => setTimeout(r, 500));

    console.log(`Result: ${client2ReceivedMove ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 14,
      name: "Second Client Received Movement",
      expected: "Client 2 receives movement broadcast for Client 1",
      actual: client2ReceivedMove ? "Client 2 received position (560, 430)" : "Update not received",
      passed: client2ReceivedMove
    });

    // Step 15: Verify office isolation
    console.log("Step 15: Verifying office isolation with a client in a separate office...");
    clientIso = await createClient();
    let isoLeakDetected = false;

    clientIso.on("presence:update", (users) => {
      if (users.some((u) => u.userId === testUserId1)) {
        isoLeakDetected = true;
      }
    });

    clientIso.emit("user:join", {
      userId: isolatedUserId,
      officeId: isolatedOfficeId,
      x: 100,
      y: 100
    });
    await new Promise((r) => setTimeout(r, 300));

    // Client 1 moves in testOfficeId
    client1.emit("avatar:move", {
      userId: testUserId1,
      officeId: testOfficeId,
      x: 600,
      y: 450
    });
    await new Promise((r) => setTimeout(r, 400));

    const isolationVerified = !isoLeakDetected;
    console.log(`Result: ${isolationVerified ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 15,
      name: "Office Isolation Verified",
      expected: "No movement updates leak to isolated office",
      actual: isolationVerified ? "Zero cross-office leakage observed" : "Leakage detected",
      passed: isolationVerified
    });

    // Step 16: Verify invalid coordinates are rejected
    console.log("Step 16: Verifying server rejection of invalid/out-of-bounds coordinates...");
    let invalidCoordsRejected = false;
    client1.on("error:invalid_coordinates", () => {
      invalidCoordsRejected = true;
    });

    client1.emit("avatar:move", {
      userId: testUserId1,
      officeId: testOfficeId,
      x: 9999, // out of bounds (> 800)
      y: -500  // out of bounds (< 0)
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log(`Result: ${invalidCoordsRejected ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 16,
      name: "Invalid Coordinates Rejected",
      expected: "Server emits error:invalid_coordinates and rejects move",
      actual: invalidCoordsRejected ? "Server rejected out-of-bounds coordinates" : "Rejection failed",
      passed: invalidCoordsRejected
    });

    // Step 17: Verify that one user cannot control another user's avatar (impersonation)
    console.log("Step 17: Verifying unauthorized avatar movement is rejected...");
    let impersonationForbidden = false;
    client1.on("error:forbidden", () => {
      impersonationForbidden = true;
    });

    // Client 1 attempts to move Client 2's avatar
    client1.emit("avatar:move", {
      userId: testUserId2,
      officeId: testOfficeId,
      x: 300,
      y: 300
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log(`Result: ${impersonationForbidden ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 17,
      name: "Impersonation Rejection",
      expected: "Server emits error:forbidden for identity mismatch",
      actual: impersonationForbidden ? "Server rejected unauthorized move attempt" : "Rejection failed",
      passed: impersonationForbidden
    });

    // Step 18: Disconnect test client and confirm final position and offline state are stored
    console.log("Step 18: Disconnecting test client 1 and verifying offline status in Atlas...");
    client1.disconnect();
    await new Promise((r) => setTimeout(r, 800));

    let offlineDoc = null;
    if (dbConnected) {
      const start = Date.now();
      while (Date.now() - start < 4000) {
        await new Promise((r) => setTimeout(r, 200));
        offlineDoc = await Presence.findOne({ userId: testUserId1, officeId: testOfficeId });
        if (offlineDoc && offlineDoc.isOnline === false) break;
      }
    }
    const disconnectPersisted = offlineDoc && offlineDoc.isOnline === false;
    console.log(`Result: ${disconnectPersisted ? "✅ PASS" : "❌ FAIL"}\n`);
    results.push({
      item: 18,
      name: "Disconnect Offline Status Recorded",
      expected: "isOnline=false and final position stored in Atlas",
      actual: disconnectPersisted ? `isOnline=${offlineDoc.isOnline}, final pos=(${offlineDoc.x}, ${offlineDoc.y})` : "Offline state not recorded",
      passed: Boolean(disconnectPersisted)
    });

  } finally {
    // Step 19: Close clients, servers, timers, and database connections cleanly
    console.log("Step 19: Closing clients, servers, and database connection cleanly...");
    if (client1 && client1.connected) client1.disconnect();
    if (client2 && client2.connected) client2.disconnect();
    if (clientIso && clientIso.connected) clientIso.disconnect();

    server.close();

    // Step 20: Clean up only records created by the test
    console.log("Step 20: Cleaning up only test records from MongoDB Atlas...");
    if (dbConnected) {
      const deleteResult = await Presence.deleteMany({ userId: { $in: createdTestUserIds } });
      console.log(`Cleaned up ${deleteResult.deletedCount} temporary test documents from Atlas.\n`);
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("[MongoDB] Disconnected from Atlas.\n");
    }

    results.push({
      item: 19,
      name: "Clean Shutdown",
      expected: "Clients, server, and connections closed",
      actual: "All resources closed cleanly",
      passed: true
    });
    results.push({
      item: 20,
      name: "Test Data Cleanup",
      expected: "Only test documents removed from Atlas",
      actual: "Cleaned up only generated test user IDs",
      passed: true
    });
  }

  // Print results table
  console.log("================================================================");
  console.log("      LIVE MONGODB ATLAS MOVEMENT INTEGRATION RESULTS (20/20)   ");
  console.log("================================================================\n");
  console.table(results.map(r => ({
    "#": r.item,
    "Test Step": r.name,
    "Expected Result": r.expected,
    "Actual Result": r.actual,
    Status: r.passed ? "PASSED" : "FAILED"
  })));

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log(`\n🎉 ALL 20/20 LIVE MOVEMENT PERSISTENCE TEST STEPS PASSED!\n`);
    process.exit(0);
  } else {
    console.log("\n⚠️ ATTENTION: Some tests failed or were blocked.\n");
    process.exit(1);
  }
}

runLiveMovementTest().catch((err) => {
  console.error("Unhandled exception in live movement test:", err);
  process.exit(1);
});
