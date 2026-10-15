const mongoose = require("mongoose");

/**
 * Obstacle Sub-Schema — Physical boundaries and acoustic zones within an office layout
 */
const obstacleSchema = new mongoose.Schema({
  obstacleId: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ["wall", "desk", "meeting_room", "lounge", "door", "custom"],
    default: "desk"
  },
  label: {
    type: String,
    default: ""
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
  width: {
    type: Number,
    required: true,
    min: 0
  },
  height: {
    type: Number,
    required: true,
    min: 0
  },
  // Future proximity audio readiness: acoustic attenuation/wall absorption
  audioAbsorption: {
    type: Number,
    default: 0.5, // 0 = transparent, 1 = total sound dampening
    min: 0,
    max: 1
  }
}, { _id: false });

/**
 * Office Schema — Floor dimensions, metadata, and spatial obstacle definitions
 */
const officeSchema = new mongoose.Schema({
  officeId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  width: {
    type: Number,
    required: true,
    default: 800
  },
  height: {
    type: Number,
    required: true,
    default: 500
  },
  obstacles: {
    type: [obstacleSchema],
    default: []
  },
  // Future proximity audio readiness: default falloff radius for this office
  defaultProximityRadius: {
    type: Number,
    default: 150,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

officeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (typeof next === "function") next();
});

module.exports = mongoose.model("Office", officeSchema);
