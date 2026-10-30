const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Load backend-specific environment variables from backend/.env.
// This must run before any module that reads process.env.
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/socketHandlers");

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 3000;

// Allow the configured frontend origin and common local Vite ports.
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

function checkOrigin(origin, callback) {
  // Requests without an Origin header include command-line clients.
  if (!origin || allowedOrigins.has(origin)) {
    return callback(null, true);
  }

  console.warn("[CORS] Rejected origin:", origin);

  return callback(new Error("Origin not allowed by ProxiSpeak"));
}

// Express middleware
app.use(
  cors({
    origin: checkOrigin,
    methods: ["GET", "POST"],
  })
);

app.use(express.json({ limit: "2mb" }));

// Existing graph API
const graphRoutes = require("./routes/graphRoutes");
app.use("/api/graph", graphRoutes);

// Socket.IO server
const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  connectTimeout: 20000,
});

// Register the existing presence and WebRTC signaling handlers.
registerSocketHandlers(io);

// Log Socket.IO transport connection errors.
io.engine.on("connection_error", (error) => {
  console.error("[Socket.IO] Connection error:", {
    code: error.code,
    message: error.message,
    context: error.context,
  });
});

// Root health check
app.get("/", (req, res) => {
  res.status(200).json({
    service: "ProxiSpeak Backend",
    status: "running",
    socketIO: "enabled",
  });
});

// Database-independent health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    server: "running",
    database:
      require("mongoose").connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Test Socket.IO reachability using an HTTP endpoint.
app.get("/health/socket", (req, res) => {
  res.status(200).json({
    status: "ok",
    socketIO: "initialized",
    transport: "websocket/polling",
  });
});

async function startServer() {
  // Start HTTP and Socket.IO independently of MongoDB availability.
  server.listen(PORT, () => {
    console.log("----------------------------------------");
    console.log("[ProxiSpeak] Backend started");
    console.log(`[HTTP] http://localhost:${PORT}`);
    console.log(`[Health] http://localhost:${PORT}/health`);
    console.log("[Socket.IO] Ready for client connections");
    console.log("[CORS] Allowed origins:");

    for (const origin of allowedOrigins) {
      console.log("  -", origin);
    }

    console.log("----------------------------------------");
  });

  // MongoDB is optional for live in-memory presence and signaling.
  try {
    await connectDB();
    console.log("[MongoDB] Database connection verified.");
  } catch (error) {
    console.error(
      "[MongoDB] Connection failed:",
      error.message
    );

    console.warn(
      "[MongoDB] Live signaling can continue, but database persistence is unavailable."
    );
  }
}

startServer().catch((error) => {
  console.error("[Server] Startup error:", error.message);
});

function shutdown(signal) {
  console.log(`[Server] Received ${signal}. Shutting down...`);

  io.close(() => {
    console.log("[Socket.IO] Closed.");

    // Socket.IO closes its underlying HTTP server.
    require("mongoose")
      .disconnect()
      .catch((error) => {
        console.error(
          "[MongoDB] Disconnect error:",
          error.message
        );
      })
      .finally(() => {
        process.exit(0);
      });
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));