const { connectDB, disconnectDB } = require("./db");
const { Presence } = require("./models");

async function runTest() {
  console.log("==================================================");
  console.log("   ProxiSpeak Database Connection & Schema Test   ");
  console.log("==================================================");

  try {
    await connectDB();
    console.log("✅ Step 1: MongoDB is reachable and connected!\n");

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

    console.log("📝 Step 2: Inserting sample Presence document...");
    console.log(JSON.stringify(samplePresenceData, null, 2));

    const insertedPresence = await Presence.create(samplePresenceData);
    console.log(`✅ Document successfully inserted! (ID: ${insertedPresence._id})\n`);

    console.log("🔍 Step 3: Querying the document back from MongoDB...");
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

    console.log("\n🧹 Step 4: Cleaning up test document...");
    await Presence.deleteOne({ _id: retrievedPresence._id });
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 ALL CHECKS PASSED: Database connection and Presence schema are fully operational!");
  } catch (error) {
    console.error("\n❌ Database test encountered an issue:");
    console.error(error.message);
    console.log("\n💡 TROUBLESHOOTING TIPS:");
    console.log("1. Ensure your MongoDB Atlas cluster or local MongoDB instance is active.");
    console.log("2. Check database/.env and verify MONGODB_URI:");
    console.log("   - In MongoDB Atlas: Go to Database Access -> Add User (readWriteAnyDatabase).");
    console.log("   - In Network Access -> Add IP Address (add 0.0.0.0/0 or your current IP).");
    console.log("   - Replace <username> and <password> in your connection string.");
  } finally {
    await disconnectDB();
    console.log("==================================================");
  }
}

if (require.main === module) {
  runTest();
}

module.exports = runTest;
