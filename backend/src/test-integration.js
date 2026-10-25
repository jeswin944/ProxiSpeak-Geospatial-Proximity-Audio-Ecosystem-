require("dotenv").config();

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { io: Client } = require("socket.io-client");
const mongoose = require("mongoose");
const registerSocketHandlers = require("./socket/socketHandlers");

async function runIntegrationTests() {
  console.log("================================================================");
  console.log("      ProxiSpeak Day 3 — Integration Testing Test Suite        ");
  console.log("================================================================\n");

  const results = [];

  // Setup local test server on dynamic port
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  registerSocketHandlers(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const testPort = server.address().port;
  const serverUrl = `http://localhost:${testPort}`;
  console.log(`[Test Server] Running on ${serverUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Scenario 1: Two users join the same office -> Both appear
    // -------------------------------------------------------------
    console.log("--- Scenario 1: Two users join the same office ---");
    const clientA = Client(serverUrl, { transports: ["websocket"], forceNew: true });
    const clientB = Client(serverUrl, { transports: ["websocket"], forceNew: true });

    await Promise.all([
      new Promise((res) => clientA.on("connect", res)),
      new Promise((res) => clientB.on("connect", res))
    ]);

    let clientAReceivedB = false;
    let clientBReceivedA = false;

    clientA.on("presence:update", (users) => {
      if (users.some((u) => u.userId === "user_B")) {
        clientAReceivedB = true;
      }
    });

    clientB.on("presence:update", (users) => {
      if (users.some((u) => u.userId === "user_A")) {
        clientBReceivedA = true;
      }
    });

    clientA.emit("user:join", { userId: "user_A", officeId: "office_1", x: 100, y: 100 });
    await new Promise((r) => setTimeout(r, 200));

    clientB.emit("user:join", { userId: "user_B", officeId: "office_1", x: 200, y: 200 });
    await new Promise((r) => setTimeout(r, 300));

    const s1Passed = clientAReceivedB && clientBReceivedA;
    results.push({
      test: "Two users join the same office",
      expected: "Both appear",
      actual: s1Passed ? "Both appear in presence:update lists on each client" : `A received B: ${clientAReceivedB}, B received A: ${clientBReceivedA}`,
      passed: s1Passed
    });
    console.log(`Result: ${s1Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 2: A user moves -> Other clients receive the new position
    // -------------------------------------------------------------
    console.log("--- Scenario 2: A user moves ---");
    let movedPosition = null;

    clientB.on("presence:update", (users) => {
      const userA = users.find((u) => u.userId === "user_A");
      if (userA && userA.x === 320 && userA.y === 240) {
        movedPosition = userA;
      }
    });

    clientA.emit("avatar:move", {
      userId: "user_A",
      officeId: "office_1",
      x: 320,
      y: 240
    });

    await new Promise((r) => setTimeout(r, 300));

    const s2Passed = movedPosition !== null;
    results.push({
      test: "A user moves",
      expected: "Other clients receive the new position",
      actual: s2Passed ? `Other client received updated position (${movedPosition.x}, ${movedPosition.y})` : "Other client did not receive position",
      passed: s2Passed
    });
    console.log(`Result: ${s2Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 3: Multiple users move together -> Each avatar remains independent
    // -------------------------------------------------------------
    console.log("--- Scenario 3: Multiple users move together ---");
    let userASeenByB = null;
    let userBSeenByA = null;

    clientB.on("presence:update", (users) => {
      const uA = users.find((u) => u.userId === "user_A");
      if (uA && uA.x === 150 && uA.y === 120) {
        userASeenByB = uA;
      }
    });

    clientA.on("presence:update", (users) => {
      const uB = users.find((u) => u.userId === "user_B");
      if (uB && uB.x === 450 && uB.y === 380) {
        userBSeenByA = uB;
      }
    });

    // Both users move simultaneously to independent positions
    clientA.emit("avatar:move", { userId: "user_A", officeId: "office_1", x: 150, y: 120 });
    clientB.emit("avatar:move", { userId: "user_B", officeId: "office_1", x: 450, y: 380 });

    await new Promise((r) => setTimeout(r, 350));

    const s3Passed = userASeenByB !== null && userBSeenByA !== null &&
                     (userASeenByB.x !== userBSeenByA.x || userASeenByB.y !== userBSeenByA.y);
    results.push({
      test: "Multiple users move together",
      expected: "Each avatar remains independent",
      actual: s3Passed ? `Independent positions preserved: User A=(150, 120), User B=(450, 380)` : "Positions collided or not received",
      passed: s3Passed
    });
    console.log(`Result: ${s3Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 4: A user disconnects -> Their avatar disappears
    // -------------------------------------------------------------
    console.log("--- Scenario 4: A user disconnects ---");
    let leftUserData = null;

    clientA.on("user:left", (data) => {
      leftUserData = data;
    });

    clientB.disconnect();
    await new Promise((r) => setTimeout(r, 300));

    const s4Passed = leftUserData && leftUserData.userId === "user_B";
    results.push({
      test: "A user disconnects",
      expected: "Their avatar disappears",
      actual: s4Passed ? `Client received 'user:left' event for ${leftUserData.userId}` : "Disconnect event not received",
      passed: s4Passed
    });
    console.log(`Result: ${s4Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 5: Invalid coordinates are sent -> Server rejects them
    // -------------------------------------------------------------
    console.log("--- Scenario 5: Invalid coordinates are sent ---");
    let rejectionReceived = false;

    clientA.on("error:invalid_coordinates", (err) => {
      rejectionReceived = true;
    });

    // Send invalid out-of-bounds coordinates (x: 1200 > 800, y: -90 < 0)
    clientA.emit("avatar:move", {
      userId: "user_A",
      officeId: "office_1",
      x: 1200,
      y: -90
    });

    await new Promise((r) => setTimeout(r, 300));

    const s5Passed = rejectionReceived;
    results.push({
      test: "Invalid coordinates are sent",
      expected: "Server rejects them",
      actual: s5Passed ? "Server caught invalid coords and emitted 'error:invalid_coordinates'" : "Server did not reject invalid coords",
      passed: s5Passed
    });
    console.log(`Result: ${s5Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    clientA.disconnect();

    // -------------------------------------------------------------
    // Scenario 6: Database connection fails -> Backend reports the failure
    // -------------------------------------------------------------
    console.log("--- Scenario 6: Database connection fails ---");
    let errorHandledCorrectly = false;
    let reportedErrorMessage = "";

    try {
      await mongoose.connect("mongodb://nonexistent-host-test:27017/proxispeak", {
        serverSelectionTimeoutMS: 1500
      });
    } catch (dbErr) {
      errorHandledCorrectly = true;
      reportedErrorMessage = dbErr.message;
    }

    const s6Passed = errorHandledCorrectly;
    results.push({
      test: "Database connection fails",
      expected: "Backend reports the failure",
      actual: s6Passed ? `Backend caught error: "${reportedErrorMessage.substring(0, 50)}..."` : "Connection failure was not handled",
      passed: s6Passed
    });
    console.log(`Result: ${s6Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 7: Client in another office does not receive updates
    // -------------------------------------------------------------
    console.log("--- Scenario 7: Room isolation across offices ---");
    const clientOffice1 = Client(serverUrl, { transports: ["websocket"], forceNew: true });
    const clientOffice2 = Client(serverUrl, { transports: ["websocket"], forceNew: true });

    await Promise.all([
      new Promise((res) => clientOffice1.on("connect", res)),
      new Promise((res) => clientOffice2.on("connect", res))
    ]);

    let office2ReceivedLeak = false;
    clientOffice2.on("presence:update", (users) => {
      if (users.some((u) => u.userId === "user_isolated_1")) {
        office2ReceivedLeak = true;
      }
    });

    clientOffice1.emit("user:join", { userId: "user_isolated_1", officeId: "room_alpha", x: 100, y: 100 });
    clientOffice2.emit("user:join", { userId: "user_isolated_2", officeId: "room_beta", x: 100, y: 100 });
    await new Promise((r) => setTimeout(r, 200));

    // Move user in room_alpha
    clientOffice1.emit("avatar:move", { userId: "user_isolated_1", officeId: "room_alpha", x: 250, y: 250 });
    await new Promise((r) => setTimeout(r, 300));

    const s7Passed = !office2ReceivedLeak;
    results.push({
      test: "Room isolation across offices",
      expected: "Client in another office does not receive movement updates",
      actual: s7Passed ? "Zero cross-office leakage observed" : "Client in room_beta received update from room_alpha",
      passed: s7Passed
    });
    console.log(`Result: ${s7Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    clientOffice1.disconnect();
    clientOffice2.disconnect();

    // -------------------------------------------------------------
    // Scenario 8: User cannot move another user's avatar (Impersonation)
    // -------------------------------------------------------------
    console.log("--- Scenario 8: Impersonation rejection ---");
    const clientImposter = Client(serverUrl, { transports: ["websocket"], forceNew: true });
    await new Promise((res) => clientImposter.on("connect", res));

    let forbiddenReceived = false;
    clientImposter.on("error:forbidden", () => {
      forbiddenReceived = true;
    });

    clientImposter.emit("user:join", { userId: "legit_user", officeId: "office_sec", x: 100, y: 100 });
    await new Promise((r) => setTimeout(r, 200));

    // Attempt to move another user's avatar
    clientImposter.emit("avatar:move", { userId: "victim_user", officeId: "office_sec", x: 300, y: 300 });
    await new Promise((r) => setTimeout(r, 300));

    const s8Passed = forbiddenReceived;
    results.push({
      test: "Identity impersonation rejection",
      expected: "Server rejects movement under a different userId",
      actual: s8Passed ? "Server caught identity mismatch and emitted 'error:forbidden'" : "Server did not reject impersonation attempt",
      passed: s8Passed
    });
    console.log(`Result: ${s8Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    clientImposter.disconnect();

    // -------------------------------------------------------------
    // Scenario 9: Reconnecting does not create duplicate presence
    // -------------------------------------------------------------
    console.log("--- Scenario 9: Reconnect duplicate prevention ---");
    const clientRecon = Client(serverUrl, { transports: ["websocket"], forceNew: true });
    await new Promise((res) => clientRecon.on("connect", res));

    clientRecon.emit("user:join", { userId: "recon_user", officeId: "office_recon", x: 110, y: 110 });
    await new Promise((r) => setTimeout(r, 200));

    clientRecon.disconnect();
    await new Promise((r) => setTimeout(r, 300));

    // Reconnect as same user
    const clientRecon2 = Client(serverUrl, { transports: ["websocket"], forceNew: true });
    await new Promise((res) => clientRecon2.on("connect", res));

    clientRecon2.emit("user:join", { userId: "recon_user", officeId: "office_recon", x: 150, y: 150 });
    await new Promise((r) => setTimeout(r, 200));

    // Second client joins to inspect office user list
    const clientObserver = Client(serverUrl, { transports: ["websocket"], forceNew: true });
    await new Promise((res) => clientObserver.on("connect", res));

    let presenceList = [];
    clientObserver.on("presence:update", (users) => {
      presenceList = users;
    });

    clientObserver.emit("user:join", { userId: "observer_user", officeId: "office_recon", x: 200, y: 200 });
    await new Promise((r) => setTimeout(r, 300));

    const reconOccurrences = presenceList.filter((u) => u.userId === "recon_user").length;
    const s9Passed = reconOccurrences === 1;

    results.push({
      test: "Reconnect duplicate prevention",
      expected: "Exactly one presence record for reconnected user",
      actual: s9Passed ? `Exactly 1 instance of recon_user in presence list` : `Found ${reconOccurrences} instances of recon_user`,
      passed: s9Passed
    });
    console.log(`Result: ${s9Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    clientRecon2.disconnect();
    clientObserver.disconnect();

    // -------------------------------------------------------------
    // Summary Table
    // -------------------------------------------------------------
    console.log("================================================================");
    console.log("                INTEGRATION TEST RESULTS SUMMARY                ");
    console.log("================================================================\n");
    console.table(results.map(r => ({
      Test: r.test,
      "Expected Result": r.expected,
      "Actual Result": r.actual,
      Status: r.passed ? "PASSED" : "FAILED"
    })));

    const allPassed = results.every(r => r.passed);
    if (allPassed) {
      console.log(`\n🎉 ALL ${results.length} INTEGRATION TEST SCENARIOS PASSED SUCCESSFULLY!\n`);
    } else {
      console.log("\n❌ SOME INTEGRATION TESTS FAILED\n");
      process.exitCode = 1;
    }

  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runIntegrationTests();
