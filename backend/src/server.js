require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/socketHandlers");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const graphRoutes = require("./routes/graphRoutes");
app.use("/api/graph", graphRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

registerSocketHandlers(io);

app.get("/", (req, res) => {
  res.send("ProxiSpeak backend is running");
});

const PORT = process.env.PORT || 3000;

// Initialize MongoDB Atlas connection, then launch HTTP & Socket.IO server
connectDB()
  .then(() => {
    console.log("[MongoDB] Database connection verified.");
  })
  .catch((error) => {
    console.error("[MongoDB] Connection warning:", error.message);
    console.warn("[MongoDB] Operating in in-memory mode for real-time signaling.");
  })
  .finally(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
