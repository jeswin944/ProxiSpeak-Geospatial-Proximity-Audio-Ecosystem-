const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/proxispeak";

/**
 * Connect to MongoDB instance
 * @param {string} [uri] Optional custom URI override
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(uri = MONGODB_URI) {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("[MongoDB] Already connected to database.");
      return mongoose;
    }

    console.log(`[MongoDB] Connecting to MongoDB...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    console.log(`[MongoDB] Active Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("[MongoDB] Connection error:", error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB instance
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("[MongoDB] Disconnected from MongoDB.");
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
