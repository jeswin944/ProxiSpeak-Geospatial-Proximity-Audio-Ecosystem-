require("dotenv").config();

const connectDB = require("./config/db");
const Presence = require("./models/Presence");

async function runTest() {
  console.log("==================================================");
  console.log("  ProxiSpeak Backend — Database Integration Test  ");
  console.log("==================================================");

  try {
    // Step 1: Connect
    await connectDB();
    console.log("\u2705 Step 1: MongoDB connection established!\n");

    // Step 2: Insert a test document
    const testUserId = `test-user-${Date.now()}`;
    const testOfficeId = "office-main";

    const doc = await Presence.create({
      userId: testUserId,
      officeId: testOfficeId,
      x: 400,
      y: 250,
      isOnline: true,
    });
    console.log(`\u2705 Step 2: Test document inserted (ID: ${doc._id})`);
    console.log(`   userId   : ${doc.userId}`);
    console.log(`   officeId : ${doc.officeId}`);
    console.log(`   x / y    : ${doc.x} / ${doc.y}\n`);

    // Step 3: Read it back
    const found = await Presence.findOne({ userId: testUserId, officeId: testOfficeId });
    if (!found) throw new Error("Document not found after insert!");
    console.log(`\u2705 Step 3: Document retrieved from Atlas:`);
    console.log(`   _id      : ${found._id}`);
    console.log(`   isOnline : ${found.isOnline}`);
    console.log(`   lastSeen : ${found.lastSeen}\n`);

    // Step 4: Verify values
    if (found.x !== 400 || found.y !== 250) {
      throw new Error(`Coordinate mismatch: expected (400, 250), got (${found.x}, ${found.y})`);
    }
    console.log("\u2705 Step 4: Coordinate values verified (400, 250)\n");

    // Step 5: Cleanup
    await Presence.deleteOne({ _id: found._id });
    console.log("\u2705 Step 5: Test document removed from database\n");

    console.log("\ud83c\udf89 ALL TESTS PASSED — Atlas connection and Presence schema work correctly!");

  } catch (err) {
    console.error("\n\u274c TEST FAILED:", err.message);
    console.log("\n\ud83d\udca1 Check your backend/.env MONGODB_URI and Atlas network access settings.");
    process.exitCode = 1;
  } finally {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
    console.log("\n[MongoDB] Disconnected. Test complete.");
    console.log("==================================================");
  }
}

runTest();
