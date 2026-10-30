const mongoose = require("mongoose");

/**
 * Connect to MongoDB Atlas using MONGODB_URI from environment.
 *
 * dotenv is intentionally NOT loaded here — server.js (or any other
 * entry point) is responsible for loading the correct .env file before
 * importing this module.  Loading dotenv a second time here with no
 * explicit path would silently fall back to CWD-relative ".env" (i.e.
 * the project root) and miss the backend-specific credentials stored in
 * backend/.env.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Check that backend/.env is loaded before connectDB() is called."
    );
  }

  console.log("[MongoDB] Connecting to database...");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("[MongoDB] Connected successfully.");
  console.log(`[MongoDB] Active database: ${mongoose.connection.name}`);
}

module.exports = connectDB;
