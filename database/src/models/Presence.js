const mongoose = require("mongoose");

const presenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  officeId: {
    type: String,
    required: true
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
  }
});

presenceSchema.index({ officeId: 1, userId: 1 }, {
  unique: true
});

module.exports = mongoose.model("Presence", presenceSchema);
