require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { Presence, Office, User } = require("./models");

async function runDatabaseTests() {
  console.log("================================================================");
  console.log("    ProxiSpeak Member 4 — MongoDB Atlas & Schema Test Suite     ");
  console.log("================================================================\n");

  let testPassedCount = 0;
  let testTotalCount = 6;

  try {
    // -------------------------------------------------------------
    // Test 1: Verify Atlas Connection and .env configuration
    // -------------------------------------------------------------
    console.log("Test 1: Connecting to MongoDB Atlas...");
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is missing!");
    }
    await connectDB();
    console.log("✅ PASS: Connected to MongoDB Atlas cluster.\n");
    testPassedCount++;

    // -------------------------------------------------------------
    // Test 2: Insert a test presence document with valid coordinates
    // -------------------------------------------------------------
    console.log("Test 2: Inserting valid Presence document...");
    const testUserId = `test-user-${Date.now()}`;
    const testOfficeId = "office_1";
    const initialCoords = { x: 350, y: 220 };

    const presenceDoc = await Presence.create({
      userId: testUserId,
      officeId: testOfficeId,
      x: initialCoords.x,
      y: initialCoords.y,
      isOnline: true,
      lastSeen: new Date()
    });

    console.log(`✅ PASS: Document inserted with ID: ${presenceDoc._id}`);
    console.log(`   userId: ${presenceDoc.userId}, officeId: ${presenceDoc.officeId}`);
    console.log(`   x: ${presenceDoc.x}, y: ${presenceDoc.y}, isOnline: ${presenceDoc.isOnline}`);
    console.log(`   lastSeen: ${presenceDoc.lastSeen.toISOString()}\n`);
    testPassedCount++;

    // -------------------------------------------------------------
    // Test 3: Read the document back and verify coordinate values
    // -------------------------------------------------------------
    console.log("Test 3: Reading document back and validating coordinates...");
    const retrieved = await Presence.findOne({ userId: testUserId, officeId: testOfficeId });
    if (!retrieved) {
      throw new Error(`Failed to retrieve presence document for ${testUserId}`);
    }

    if (retrieved.x !== initialCoords.x || retrieved.y !== initialCoords.y) {
      throw new Error(`Coordinate mismatch! Expected (${initialCoords.x}, ${initialCoords.y}) but got (${retrieved.x}, ${retrieved.y})`);
    }
    console.log(`✅ PASS: Coordinates accurately verified: (${retrieved.x}, ${retrieved.y})\n`);
    testPassedCount++;

    // -------------------------------------------------------------
    // Test 4: Verify that invalid coordinates & data are rejected
    // -------------------------------------------------------------
    console.log("Test 4: Testing schema validation on invalid inputs...");
    const invalidTestCases = [
      {
        name: "Negative X coordinate (-20)",
        doc: { userId: "invalid-user-1", officeId: "office_1", x: -20, y: 100 },
      },
      {
        name: "X coordinate exceeding office boundary (850 > 800)",
        doc: { userId: "invalid-user-2", officeId: "office_1", x: 850, y: 100 },
      },
      {
        name: "Negative Y coordinate (-5)",
        doc: { userId: "invalid-user-3", officeId: "office_1", x: 100, y: -5 },
      },
      {
        name: "Y coordinate exceeding office boundary (550 > 500)",
        doc: { userId: "invalid-user-4", officeId: "office_1", x: 100, y: 550 },
      },
      {
        name: "Missing required officeId",
        doc: { userId: "invalid-user-5", x: 100, y: 100 },
      },
      {
        name: "Missing required userId",
        doc: { officeId: "office_1", x: 100, y: 100 },
      },
    ];

    for (const tc of invalidTestCases) {
      let rejected = false;
      try {
        const invalidDoc = new Presence(tc.doc);
        await invalidDoc.validate();
      } catch (validationErr) {
        rejected = true;
      }

      if (!rejected) {
        throw new Error(`Validation failed to reject invalid case: ${tc.name}`);
      }
      console.log(`   ✓ Correctly rejected: ${tc.name}`);
    }
    console.log("✅ PASS: All invalid input cases were rejected by schema validation.\n");
    testPassedCount++;

    // -------------------------------------------------------------
    // Test 5: Verify Office Layout Schema (dimensions and obstacles)
    // -------------------------------------------------------------
    console.log("Test 5: Verifying Office Layout model with obstacles...");
    const testOfficeModelId = `office-test-${Date.now()}`;
    const officeDoc = await Office.create({
      officeId: testOfficeModelId,
      name: "Engineering HQ",
      width: 800,
      height: 500,
      obstacles: [
        {
          obstacleId: "obs-wall-1",
          type: "wall",
          label: "North Dividing Wall",
          x: 200,
          y: 0,
          width: 10,
          height: 150
        },
        {
          obstacleId: "obs-desk-1",
          type: "desk",
          label: "Dev Cluster A",
          x: 300,
          y: 200,
          width: 120,
          height: 60
        }
      ]
    });

    const retrievedOffice = await Office.findOne({ officeId: testOfficeModelId });
    if (!retrievedOffice || retrievedOffice.obstacles.length !== 2) {
      throw new Error("Failed to persist and read Office Layout model!");
    }
    console.log(`✅ PASS: Office layout created and verified:`);
    console.log(`   officeId: ${retrievedOffice.officeId}, dimensions: ${retrievedOffice.width}x${retrievedOffice.height}`);
    console.log(`   obstacles count: ${retrievedOffice.obstacles.length} (${retrievedOffice.obstacles.map(o => o.label).join(", ")})\n`);
    testPassedCount++;

    // -------------------------------------------------------------
    // Test 6: Cleanup test documents
    // -------------------------------------------------------------
    console.log("Test 6: Cleaning up test artifacts...");
    await Presence.deleteOne({ userId: testUserId });
    await Office.deleteOne({ officeId: testOfficeModelId });
    console.log("✅ PASS: Temporary test documents removed from Atlas.\n");
    testPassedCount++;

    console.log("================================================================");
    console.log(` 🎉 ALL ${testPassedCount}/${testTotalCount} DATABASE TESTS PASSED SUCCESSFULLY!`);
    console.log("================================================================");

  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("[MongoDB] Disconnected. Done.");
  }
}

runDatabaseTests();
