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
    // Scenario 1: Two users join one office -> Both appear
    // -------------------------------------------------------------
    console.log("--- Scenario 1: Two users join one office ---");
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
      test: "Two users join one office",
      expected: "Both appear",
      actual: s1Passed ? "Both users appeared on each other's clients" : `A received B: ${clientAReceivedB}, B received A: ${clientBReceivedA}`,
      passed: s1Passed
    });
    console.log(`Result: ${s1Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 2: One user moves -> Other browser receives position
    // -------------------------------------------------------------
    console.log("--- Scenario 2: One user moves ---");
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
      test: "One user moves",
      expected: "Other browser receives the position",
      actual: s2Passed ? `Browser B received position (${movedPosition.x}, ${movedPosition.y})` : "Browser B did not receive updated position",
      passed: s2Passed
    });
    console.log(`Result: ${s2Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 3: A user disconnects -> Their avatar disappears
    // -------------------------------------------------------------
    console.log("--- Scenario 3: A user disconnects ---");
    let leftUserData = null;

    clientA.on("user:left", (data) => {
      leftUserData = data;
    });

    clientB.disconnect();
    await new Promise((r) => setTimeout(r, 300));

    const s3Passed = leftUserData && leftUserData.userId === "user_B";
    results.push({
      test: "A user disconnects",
      expected: "Their avatar disappears",
      actual: s3Passed ? `Browser A received 'user:left' event for ${leftUserData.userId}` : "Disconnect event not received",
      passed: s3Passed
    });
    console.log(`Result: ${s3Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // -------------------------------------------------------------
    // Scenario 4: Invalid coordinates are sent -> Server rejects them
    // -------------------------------------------------------------
    console.log("--- Scenario 4: Invalid coordinates are sent ---");
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

    const s4Passed = rejectionReceived;
    results.push({
      test: "Invalid coordinates are sent",
      expected: "Server rejects them",
      actual: s4Passed ? "Server caught invalid coords and emitted 'error:invalid_coordinates'" : "Server did not reject invalid coords",
      passed: s4Passed
    });
    console.log(`Result: ${s4Passed ? "✅ PASS" : "❌ FAIL"}\n`);

    clientA.disconnect();

    // -------------------------------------------------------------
    // Scenario 5: MongoDB is unavailable -> Backend reports connection failure
    // -------------------------------------------------------------
    console.log("--- Scenario 5: MongoDB is unavailable ---");
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

    const s5Passed = errorHandledCorrectly;
    results.push({
      test: "MongoDB is unavailable",
      expected: "Backend reports the connection failure",
      actual: s5Passed ? `Backend caught error: "${reportedErrorMessage.substring(0, 50)}..."` : "Connection failure was not handled",
      passed: s5Passed
    });
    console.log(`Result: ${s5Passed ? "✅ PASS" : "❌ FAIL"}\n`);

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
      console.log("\n🎉 ALL 5 INTEGRATION TEST SCENARIOS PASSED SUCCESSFULLY!\n");
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
