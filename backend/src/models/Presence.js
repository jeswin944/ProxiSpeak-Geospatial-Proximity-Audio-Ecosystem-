const mongoose = require("mongoose");

/**
 * Presence Schema — Geospatial presence tracking for avatars in office spaces
 * Ready for future spatial audio calculations (proximity radius, mute state, audio zone)
 */
const presenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  officeId: {
    type: String,
    required: true,
    trim: true
  },
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 800
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 500
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  // --- Future Proximity Audio Readiness (unimplemented today) ---
  audioRange: {
    type: Number,
    default: 150, // Proximity threshold in pixels
    min: 0
  },
  audioZone: {
    type: String,
    default: null // Specific acoustic zone (e.g., "meeting_room_a")
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  isDeafened: {
    type: Boolean,
    default: false
  }
});

// Ensure efficient single lookup and uniqueness per user within an office
presenceSchema.index({ officeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Presence", presenceSchema);
