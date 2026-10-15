const { connectDB, disconnectDB } = require("./db");
const { Presence, Office } = require("./models");

async function runTest() {
  console.log("==================================================");
  console.log("   ProxiSpeak Database Connection & Schema Test   ");
  console.log("==================================================");

  try {
    // Task 1.1: Verify backend/database connects to MongoDB Atlas
    await connectDB();
    console.log("✅ Step 1: MongoDB Atlas is reachable and connected!\n");

    // Task 1.2: Check office dimensions and coordinate formats match frontend
    // Frontend standard: width: 800, height: 500
    const FRONTEND_WIDTH = 800;
    const FRONTEND_HEIGHT = 500;
    console.log(`Checking office coordinate bounds against frontend: 0..${FRONTEND_WIDTH} x 0..${FRONTEND_HEIGHT}`);

    // Task 1.3: Test inserting and reading a presence document
    const testOfficeId = "office-main";
    const testUserId = `user-test-${Date.now()}`;
    const samplePresenceData = {
      userId: testUserId,
      officeId: testOfficeId,
      x: 400, // Center coordinate within 800x500 office boundary
      y: 250,
      isOnline: true,
      lastSeen: new Date()
    };

    console.log("Step 2: Inserting sample Presence document...");
    const insertedPresence = await Presence.create(samplePresenceData);
    console.log(`✅ Document successfully inserted! (ID: ${insertedPresence._id})\n`);

    console.log("Step 3: Querying the document back from MongoDB...");
    const retrievedPresence = await Presence.findOne({
      userId: testUserId,
      officeId: testOfficeId
    });

    if (!retrievedPresence) {
      throw new Error("Failed to retrieve the inserted presence document.");
    }

    console.log("✅ Document successfully retrieved:");
    console.log({
      id: retrievedPresence._id.toString(),
      userId: retrievedPresence.userId,
      officeId: retrievedPresence.officeId,
      x: retrievedPresence.x,
      y: retrievedPresence.y,
      isOnline: retrievedPresence.isOnline,
      lastSeen: retrievedPresence.lastSeen
    });

    // Task 1.4: Verify that invalid coordinates are rejected
    console.log("\nStep 4: Verifying schema rejects invalid coordinates...");
    const invalidCoords = [
      { name: "Negative X (-10)", doc: { userId: "u1", officeId: "o1", x: -10, y: 100 } },
      { name: "Out-of-bounds X (950 > 800)", doc: { userId: "u2", officeId: "o1", x: 950, y: 100 } },
      { name: "Negative Y (-5)", doc: { userId: "u3", officeId: "o1", x: 100, y: -5 } },
      { name: "Out-of-bounds Y (600 > 500)", doc: { userId: "u4", officeId: "o1", x: 100, y: 600 } },
    ];

    for (const testCase of invalidCoords) {
      let rejected = false;
      try {
        const doc = new Presence(testCase.doc);
        await doc.validate();
      } catch (err) {
        rejected = true;
      }
      if (!rejected) {
        throw new Error(`Schema failed to reject invalid coordinates: ${testCase.name}`);
      }
      console.log(`   ✓ Correctly rejected: ${testCase.name}`);
    }
    console.log("✅ All invalid coordinate tests rejected by schema validation.");

    console.log("\nStep 5: Cleaning up test document...");
    await Presence.deleteOne({ _id: retrievedPresence._id });
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 ALL CHECKS PASSED: Database connection and Presence schema are fully operational!");
  } catch (error) {
    console.error("\n❌ Database test encountered an issue:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    console.log("==================================================");
  }
}

if (require.main === module) {
  runTest();
}

module.exports = runTest;
