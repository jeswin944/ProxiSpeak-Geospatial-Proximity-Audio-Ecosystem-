const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ""
  },
  avatarColor: {
    type: String,
    default: "#4F46E5"
  },
  currentOfficeId: {
    type: String,
    default: "office_1"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
