require("dotenv").config();
const mongoose = require("mongoose");

/**
 * Connect to MongoDB Atlas using MONGODB_URI from environment.
 * Ensure dotenv is loaded before calling this function.
 */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(
      `[MongoDB] Connected successfully to: ${mongoose.connection.host}`
    );
    console.log(`[MongoDB] Active database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error.message);
    throw error;
  }
}

module.exports = connectDB;
