# ProxiSpeak — Geospatial Proximity Audio Ecosystem

**ProxiSpeak** is a real-time virtual office ecosystem combining interactive 2D canvas navigation with geospatial proximity audio. Avatars move across a virtual office space, where spatial audio volume, stereo panning, and voice clarity dynamically adjust based on user distance and layout obstacles.

---

## 🌟 Key Features & Architecture

* **Spatial Proximity Audio**: Dynamic distance attenuation and positional panning powered by the Web Audio API / WebRTC.
* **Synchronized 2D Canvas**: Real-time virtual office canvas measuring **800 × 500 units**, supporting obstacle collisions and multi-user avatar movement.
* **Low-Latency Presence Indexing**: MongoDB Atlas compound indexing on `{ officeId: 1, userId: 1 }` ensuring millisecond-level coordinate lookups.
* **Modular Ecosystem Architecture**: Decoupled modules across Frontend, Backend, Spatial Audio, and Database.

---

## 👥 Week 1 Deliverables & Team Responsibilities

| Week | Backend (Node.js, Express, Socket.io, MongoDB) | Frontend (React, WebRTC, Canvas API) |
| :--- | :--- | :--- |
| **Week 1** | **Signaling & Movement:** Build WebSocket server to broadcast avatar X/Y coordinates. Setup basic MongoDB geospatial schemas. | **World Rendering:** Build the React Canvas layer. Implement smooth keyboard/mouse avatar movement and coordinate broadcasting. |

### 📋 Detailed Member Breakdown (Week 1 Tasks Completed)

#### 🔹 Member 1 — Node.js + Socket.io Server
* **Tasks Completed:**
  * Created the Node.js and Express backend server (`backend/src/server.js`).
  * Set up Socket.io for real-time bi-directional communication.
  * Handled client connections and clean disconnections (`user:join`, `disconnect`, `user:left`).
  * Received avatar coordinates from clients with server-side validation.
  * Broadcast movement coordinates to other connected users in the same office room.
* **Output:** A working, low-latency real-time signaling server.

#### 🔹 Member 2 — React Canvas & Virtual Office
* **Tasks Completed:**
  * Created the React frontend application (`frontend/`).
  * Drew a 2D office map ($800 \times 500$ units) using the real HTML5 Canvas API (`getContext("2d")`).
  * Rendered architectural grids, meeting pods, dev clusters, audio lounges, and boundary walls.
  * Displayed avatar representations at any supplied X/Y coordinate with specular reflections and drop shadows.
  * Prepared multi-avatar rendering from the synchronized presence state.
* **Output:** A working high-DPI virtual office canvas interface.

#### 🔹 Member 3 — Avatar Movement & Coordinate Broadcasting
* **Tasks Completed:**
  * Implemented keyboard movement using WASD and Arrow keys with normalized diagonal vectors.
  * Added mouse pointer click-to-move and continuous click-and-drag navigation.
  * Kept track of avatar X/Y coordinates with boundary clamping ($0 \le x \le 800$, $0 \le y \le 500$).
  * Implemented smooth delta-time movement animation loop.
  * Connected the React client to Member 1's Socket.io server.
  * Sent updated coordinates via `avatar:move` and received peer coordinates via `presence:update`.
* **Output:** Avatars that move smoothly and synchronize between multiple browsers in real time.

#### 🔹 Member 4 — MongoDB Schemas & Integration Testing
* **Tasks Completed:**
  * Set up the MongoDB Atlas connection with secure environment variable loading.
  * Designed basic schemas for user positions (`Presence`) and office layouts (`Office`, `User`).
  * Stored user IDs, office IDs, and X/Y coordinates with compound unique indexing `{ officeId: 1, userId: 1 }`.
  * Implemented atomic non-overlapping write throttling ($500\,\text{ms}$) with guaranteed trailing stop flush.
  * Validated coordinate data and enforced server-side authorization.
  * Built automated integration test suites verifying multi-client sync, room isolation, and live Atlas persistence.
  * Tested the server and frontend integration with two browsers.
* **Output:** Reliable MongoDB Atlas coordinate persistence, comprehensive test suites, and documentation.

---

## ⚡ Week 2 & Mid-Project Review Deliverables

| Deliverable | Core Technology | Highlights & Status |
| :--- | :--- | :--- |
| **Logic Compiler** | Node.js, RxJS Observables, Express | Compiles saved React Flow JSON into executable RxJS pipelines; Kahn's Algorithm cycle detection (DAG enforcement); memory leak prevention. **(7/7 Tests Passed)** |
| **Node Library** | React Flow (`@xyflow/react`), RxJS | Reusable nodes for Data Sources, Math Operations (arithmetic, comparisons, zero-division safety), and Action Triggers (rate-limited logger, event emitter, threshold alerts). **(10/10 Tests Passed)** |
| **Graph Serialization** | JSON, React Flow Schema v1.0.0 | Versioned serialization/deserialization engine; cleans transient DOM state; preserves exact node/edge IDs, positions, and handles. Restores and executes complex branching pipelines. **(5/5 Tests Passed)** |
| **MongoDB Ingestion Audit** | MongoDB Native Time-Series, Mongoose | High-throughput benchmark sustaining **6,684 writes/second** against live MongoDB Atlas (exceeding 5,000 writes/sec target) with ~15 bytes/doc compressed footprint. **(VERIFIED)** |

### 🛠️ Week 2 & Mid-Review Module Breakdown

#### 1. Logic Compiler (`backend/src/compiler/`)
* **Pipeline:** Saved JSON → Structural Validation → Kahn's Cycle Analysis → RxJS Stream Synthesis → Safe Pipeline Execution.
* **Cycle Detection:** Enforces Directed Acyclic Graph (DAG) topology using in-degree topological sort; flags all cyclic nodes and rejects loops.
* **Memory Management:** Dedicated teardown hooks and unsubscriptions for all active Observables and Subjects upon `stop()`.
* **REST Endpoints:** `/api/graph/validate`, `/api/graph/compile`, `/api/graph/execute`, `/api/graph/stop/:id`, `/api/graph/nodes`.

#### 2. Visual Node Library (`frontend/src/components/GraphEditor/`)
* **Data Sources:** `source_static`, `source_interval` (timer ticks), `source_manual` (interactive push), `source_mock_events` (proximity telemetry).
* **Math Operations:** `math_operation` (add, subtract, multiply, divide, min, max, modulo, comparisons). Guards against division by zero with fallback values.
* **Action Triggers:** `action_logger` (with `throttleTime` rate limiting), `action_event_emitter`, and `action_threshold_alert`.
* **Editor Interface:** Full React Flow canvas with node palette, import/export, and live execution stream console.

#### 3. Graph Serialization (`frontend/src/utils/graphSerialization.js`)
* Schema-validated versioning (`schemaVersion: "1.0.0"`).
* Guarantees round-trip equivalence without mutating source graph objects or creating duplicate elements.
* Validated against complex multi-branching pipeline fixture (`backend/src/fixtures/complex-branching-graph.json`).

#### 4. High-Throughput Ingestion Benchmark (`database/src/benchmark-ingestion.js`)
* Tested against live MongoDB Atlas cluster with 10 parallel worker streams and 500-document batches.
* Achieved **6,684 writes/second** (10,000 / 10,000 confirmed writes in 1.496s with 0 errors).
* Leverages MongoDB native Time-Series collection (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`) with 24-hour TTL.

---

## 🗄️ Database Models & Schemas

### 1. Presence Schema (`database/src/models/Presence.js`)
Tracks real-time avatar coordinates inside a specific office space. Strictly bounded to match the Canvas dimensions ($800 \times 500$ units).

```javascript
{
  userId: String,       // Unique user identifier (Required)
  officeId: String,     // Target office room ID (Required)
  x: Number,            // Coordinate along width (0 to 800)
  y: Number,            // Coordinate along height (0 to 500)
  isOnline: Boolean,    // Real-time connectivity status (default: true)
  lastSeen: Date        // Timestamp of latest heartbeat
}
```
* **Compound Index:** `{ officeId: 1, userId: 1 }` (unique) for fast position updates and proximity range queries.

### 2. Office Layout Schema (`database/src/models/Office.js`)
Stores office geometry, boundary configurations, and obstacle barriers.

```text
Office
├── officeId (String, unique, indexed)
├── name (String)
├── width (Number, default: 800)
├── height (Number, default: 500)
└── obstacles [Array]
    ├── obstacleId (String)
    ├── type ('wall' | 'desk' | 'meeting_room' | 'lounge' | 'door' | 'custom')
    ├── label (String)
    ├── x (0 to 800)
    ├── y (0 to 500)
    ├── width (Number)
    └── height (Number)
```

### 3. User Schema (`database/src/models/User.js`)
Persistent user profile information and styling metadata.

```javascript
{
  userId: String,          // Unique ID (Required, indexed)
  username: String,        // Display name
  email: String,           // Optional email
  avatarColor: String,     // Hex color code (e.g., #4F46E5)
  currentOfficeId: String  // Last joined office room
}
```

### 4. TelemetryEvent Schema — Time-Series Collection (`database/src/models/TelemetryEvent.js`)
Dedicated to high-frequency motion and proximity event ingestion. Configured with native MongoDB Time-Series optimization (`timeField: 'timestamp'`, `metaField: 'metadata'`, `granularity: 'seconds'`).

```javascript
{
  timestamp: Date,              // Time-series timestamp (Required)
  metadata: {
    officeId: String,           // Stable office grouping
    userId: String,             // User ID grouping
    eventType: String,          // Telemetry classification
    benchmarkRunId: String      // Run isolation identifier
  },
  data: {
    x: Number,                  // Coordinate X
    y: Number,                  // Coordinate Y
    speed: Number,              // Velocity
    signalStrength: Number      // Audio RF strength
  }
}
```
* **Time-Series TTL:** 24-hour retention (`expireAfterSeconds: 86400`).
* **Compound Metadata Indexes:** `{ 'metadata.officeId': 1, timestamp: -1 }`, `{ 'metadata.benchmarkRunId': 1 }`.

---

## 📂 Repository Structure

```text
ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem/
├── backend/
│   ├── src/
│   │   ├── compiler/           # Week 2 Logic Compiler & RxJS operator factories
│   │   ├── models/             # Presence, Office, User, and TelemetryEvent models
│   │   ├── routes/             # REST API for graph validation & execution
│   │   ├── services/           # GraphExecutionService runtime manager
│   │   ├── socket/             # Socket.IO movement & presence handlers
│   │   ├── test-compiler.js    # Logic compiler test suite
│   │   ├── test-nodes.js       # Node library test suite
│   │   ├── test-serialization.js # Graph serialization test suite
│   │   ├── test-db.js          # Live Atlas CRUD validation
│   │   └── test-integration.js # Multi-client Socket.IO test suite
│   ├── .env.example            # Backend environment template
│   └── package.json            # Backend dependencies & test scripts
├── database/
│   ├── src/
│   │   ├── models/             # Schema models (Presence, Office, User, TelemetryEvent)
│   │   ├── db.js               # Reusable Mongoose connection manager
│   │   └── benchmark-ingestion.js # High-throughput time-series ingestion benchmark
│   ├── .env.example            # Database environment template
│   └── package.json            # Database scripts & dependencies
├── frontend/                   # Canvas UI, Avatar navigation & Logic Graph Editor
│   ├── src/
│   │   ├── components/
│   │   │   ├── GraphEditor/    # React Flow editor, custom nodes & console
│   │   │   ├── OfficeCanvas.jsx # HTML5 Canvas 2D office renderer
│   │   │   └── RealtimeAvatarDemo.jsx # WASD keyboard/mouse movement demo
│   │   └── utils/
│   │       └── graphSerialization.js # Schema v1.0.0 serialization engine
│   └── package.json            # Frontend Vite & React Flow configuration
├── docs/                       # Master Specifications & Formal Audit Hub
│   ├── README.md               # Master documentation index
│   ├── week1.md                # Week 1 Master Specification
│   ├── week1-integration-test-report.md
│   ├── week2.md                # Week 2 Master Specification
│   ├── week2-completion-report.md
│   ├── week2-logic-compiler.md
│   ├── week2-node-library.md
│   ├── spatial-audio-day1-report.md
│   ├── mid-review-graph-serialization.md
│   └── mid-review-mongodb-ingestion-audit.md
├── run-ecosystem.js            # Monorepo concurrent runner (Backend + Frontend)
├── vite.config.mjs             # Root Vite fallback configuration
└── README.md                   # Main ecosystem documentation
```

---

## 🚀 Quickstart & Running the System

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [MongoDB Atlas](https://cloud.mongodb.com/) account or local MongoDB instance

### 2. Environment Configuration
Ensure `.env` exists in `backend/` and `database/` with valid credentials:
```env
PORT=3000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.w15le4t.mongodb.net/proxispeak?retryWrites=true&w=majority
```

### 3. Launching the Application

Start both the backend server and frontend application in a single command from root:
```bash
npm run dev
```
* **Frontend Web App**: [http://localhost:5173](http://localhost:5173) (Virtual Office & Logic Graph Editor)
* **Backend API & WebSockets**: [http://localhost:3000](http://localhost:3000)

Alternatively, start services individually:
```bash
npm run start:backend     # Backend Express / Socket.io server
npm run start:frontend    # Frontend Vite dev server
```

### 4. Running Verification Test Suites

```bash
# Run Week 2 & Mid-Review verification suites (Compiler, Nodes, Serialization)
npm test

# Run high-throughput MongoDB Atlas ingestion benchmark (5,000+ writes/sec target)
npm run benchmark:ingestion

# Run all test suites (Compiler, Nodes, Serialization, DB, Integration)
npm run test:all

# Run multi-client Socket.IO integration tests (9 scenarios)
npm run test:integration

# Run schema boundary & database validation test
npm run test:db

# Run spatial audio distance & volume attenuation tests
npm run test:spatial

# Build frontend production bundle
npm run build:frontend
```

For complete in-depth documentation, visit the [Master Documentation Hub](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/README.md).
