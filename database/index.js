const { connectDB, disconnectDB, mongoose } = require("./src/db");
const { Presence, Office, User } = require("./src/models");

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
  Presence,
  Office,
  User
};
