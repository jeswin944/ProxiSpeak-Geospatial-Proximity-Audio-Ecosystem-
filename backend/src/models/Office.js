const mongoose = require("mongoose");

const obstacleSchema = new mongoose.Schema({
  obstacleId: {
    type: String,
    required: true
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
  }
}, { _id: false });

const officeSchema = new mongoose.Schema({
  officeId: {
    type: String,
    required: true,
    unique: true,
    index: true
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
