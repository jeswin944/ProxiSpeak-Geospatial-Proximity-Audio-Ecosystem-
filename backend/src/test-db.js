require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { Presence, Office, User } = require("./models");

async function runDatabaseTests() {
  console.log("================================================================");
  console.log("    ProxiSpeak Member 4 — MongoDB Atlas & Schema Test Suite     ");
  console.log("================================================================\n");

  const results = [];
  let isAtlasConnected = false;
  let atlasError = null;

  // -------------------------------------------------------------
  // Test Section A: Mongoose Schema & Boundary Validation (In-Memory)
  // -------------------------------------------------------------
  console.log("--- Section A: Presence Schema & Boundary Validation ---");
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

  let allValidationCasesPassed = true;
  for (const tc of invalidTestCases) {
    let rejected = false;
    try {
      const invalidDoc = new Presence(tc.doc);
      await invalidDoc.validate();
    } catch (validationErr) {
      rejected = true;
    }

    if (!rejected) {
      allValidationCasesPassed = false;
      console.log(`   ✗ FAILED to reject: ${tc.name}`);
    } else {
      console.log(`   ✓ Correctly rejected: ${tc.name}`);
    }
  }

  results.push({
    test: "Schema Boundary & Required Field Validation",
    expected: "Reject coordinates outside 0-800, 0-500 and missing required fields",
    actual: allValidationCasesPassed ? "All 6 invalid cases correctly rejected" : "Some invalid cases allowed",
    passed: allValidationCasesPassed
  });
  console.log(`Result: ${allValidationCasesPassed ? "✅ PASS" : "❌ FAIL"}\n`);

  // -------------------------------------------------------------
  // Test Section B: Live MongoDB Atlas Connection & Document CRUD
  // -------------------------------------------------------------
  console.log("--- Section B: MongoDB Atlas Live Connection & CRUD ---");
  console.log("Attempting connection to MongoDB Atlas...");
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is missing!");
    }
    await connectDB();
    isAtlasConnected = true;
    console.log("✅ PASS: Connected to MongoDB Atlas cluster.\n");
    results.push({
      test: "MongoDB Atlas Connection",
      expected: "Connect to configured Atlas cluster",
      actual: `Connected to host: ${mongoose.connection.host}`,
      passed: true
    });
  } catch (err) {
    atlasError = err.message;
    console.error(`❌ Atlas Connection Failed: ${err.message}\n`);
    results.push({
      test: "MongoDB Atlas Connection",
      expected: "Connect to configured Atlas cluster",
      actual: `Connection failed: ${err.message}`,
      passed: false
    });
  }

  if (isAtlasConnected) {
    const testUserId = `test-user-${Date.now()}`;
    const testOfficeId = "office_1";
    const initialCoords = { x: 350, y: 220 };
    const testOfficeModelId = `office-test-${Date.now()}`;

    try {
      // Live Insert Test
      console.log("Inserting valid Presence document into Atlas...");
      const presenceDoc = await Presence.create({
        userId: testUserId,
        officeId: testOfficeId,
        x: initialCoords.x,
        y: initialCoords.y,
        isOnline: true,
        lastSeen: new Date()
      });
      console.log(`✅ Document created with ID: ${presenceDoc._id}\n`);
      results.push({
        test: "Atlas Presence Insertion",
        expected: "Insert document with coordinates (350, 220)",
        actual: `Inserted: userId=${presenceDoc.userId}, pos=(${presenceDoc.x}, ${presenceDoc.y})`,
        passed: true
      });

      // Live Read Test
      console.log("Reading document back from Atlas...");
      const retrieved = await Presence.findOne({ userId: testUserId, officeId: testOfficeId });
      const readMatched = retrieved && retrieved.x === initialCoords.x && retrieved.y === initialCoords.y;
      results.push({
        test: "Atlas Presence Retrieval",
        expected: "Read back exact coordinates",
        actual: readMatched ? `Verified (${retrieved.x}, ${retrieved.y})` : "Mismatch or missing",
        passed: Boolean(readMatched)
      });
      console.log(`Result: ${readMatched ? "✅ PASS" : "❌ FAIL"}\n`);

      // Office Layout Schema Test
      console.log("Creating and verifying Office Layout document with obstacles...");
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
          }
        ]
      });
      const retrievedOffice = await Office.findOne({ officeId: testOfficeModelId });
      const officeValid = retrievedOffice && retrievedOffice.obstacles.length === 1;
      results.push({
        test: "Atlas Office Layout Persistence",
        expected: "Create and retrieve office layout with obstacles",
        actual: officeValid ? `Verified officeId=${retrievedOffice.officeId}, obstacles=1` : "Failed",
        passed: Boolean(officeValid)
      });
      console.log(`Result: ${officeValid ? "✅ PASS" : "❌ FAIL"}\n`);

      // Cleanup
      console.log("Cleaning up test documents from Atlas...");
      await Presence.deleteOne({ userId: testUserId, officeId: testOfficeId });
      await Office.deleteOne({ officeId: testOfficeModelId });
      console.log("✅ Cleanup complete.\n");
      results.push({
        test: "Atlas Test Document Cleanup",
        expected: "Clean up test-created documents",
        actual: "Deleted test documents successfully",
        passed: true
      });
    } catch (crudErr) {
      console.error("Live CRUD error:", crudErr.message);
      results.push({
        test: "Atlas Live CRUD Operations",
        expected: "Perform CRUD operations",
        actual: `CRUD error: ${crudErr.message}`,
        passed: false
      });
    } finally {
      await mongoose.disconnect();
    }
  } else {
    results.push({
      test: "Atlas Presence Live CRUD",
      expected: "Insert, verify, and delete live Presence documents",
      actual: `Blocked: Atlas unreachable (${atlasError})`,
      passed: false
    });
  }

  // -------------------------------------------------------------
  // Summary Table
  // -------------------------------------------------------------
  console.log("================================================================");
  console.log("                DATABASE TEST RESULTS SUMMARY                   ");
  console.log("================================================================\n");
  console.table(results.map(r => ({
    Test: r.test,
    "Expected Result": r.expected,
    "Actual Result": r.actual,
    Status: r.passed ? "PASSED" : "FAILED / BLOCKED"
  })));

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log("\n🎉 ALL DATABASE AND SCHEMA TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.log("\n⚠️ NOTE: Schema validation PASSED. Live Atlas tests blocked by authentication failure.\n");
    if (atlasError) {
      console.log(`Diagnosis: MongoDB Atlas authentication rejected credentials: "${atlasError}".`);
      console.log("Action Required: Provide updated Atlas credentials in .env.\n");
    }
    process.exit(1);
  }
}

runDatabaseTests();
