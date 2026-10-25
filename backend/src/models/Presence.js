const mongoose = require("mongoose");

/**
 * Presence Schema — Geospatial & Coordinate Tracking for ProxiSpeak Ecosystem
 *
 * Architecture & Geospatial Review (Week 1):
 * - Coordinate Space: 2D Cartesian plane matching the 800 × 500 HTML5 Office Canvas.
 * - Spatial Audio Calculation: Proximity between avatars is calculated using the
 *   2D Euclidean distance formula: d = sqrt((x2 - x1)^2 + (y2 - y1)^2).
 *   When d <= audioRange (150px), spatial audio streams are attenuated inversely proportional to d.
 * - Planetary (2dsphere) vs Planar (2D) Spatial Indexing:
 *   MongoDB's `2dsphere` index strictly expects WGS84 longitude [-180, 180] and latitude [-90, 90].
 *   Because virtual office layouts exist in local pixel space (0-800, 0-500), planetary spherical
 *   indexing is mathematically incompatible without coordinate normalization. For database-side
 *   proximity queries, planar Euclidean queries or office-partitioned compound lookups are used.
 * - Indexing: Compound unique index { officeId: 1, userId: 1 } guarantees zero duplicate presence
 *   documents per user per office and ultra-low latency office-scoped lookups.
 */
const presenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, "userId is required"],
    trim: true
  },
  officeId: {
    type: String,
    required: [true, "officeId is required"],
    trim: true
  },
  x: {
    type: Number,
    required: [true, "x coordinate is required"],
    min: [0, "x coordinate cannot be less than 0"],
    max: [800, "x coordinate cannot exceed office boundary 800"]
  },
  y: {
    type: Number,
    required: [true, "y coordinate is required"],
    min: [0, "y coordinate cannot be less than 0"],
    max: [500, "y coordinate cannot exceed office boundary 500"]
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  // --- Proximity Audio Architecture Fields (Week 2/3 WebRTC / Web Audio API) ---
  audioRange: {
    type: Number,
    default: 150, // Proximity threshold in pixels
    min: 0
  },
  audioZone: {
    type: String,
    default: null // Specific acoustic zone (e.g., "meeting_pod_a", "lounge")
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

// Compound unique index ensuring 1 presence document per user per office
presenceSchema.index({ officeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Presence", presenceSchema);
