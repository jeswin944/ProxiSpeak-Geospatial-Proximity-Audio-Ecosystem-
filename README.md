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

---

## 📂 Repository Structure

```text
ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem/
├── backend/
│   ├── src/
│   │   └── models/
│   │       └── Presence.js     # Shared model copy for backend
│   ├── .env.example            # Backend environment template
│   └── .gitignore              # Ignores backend secrets
├── database/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Office.js       # Office layout & obstacle schema
│   │   │   ├── Presence.js     # Live coordinates schema
│   │   │   ├── User.js         # User profile schema
│   │   │   └── index.js        # Model bundle exports
│   │   ├── db.js               # Reusable Mongoose connection manager
│   │   └── test-db.js          # Automated Atlas test script
│   ├── index.js                # Database package entry point
│   ├── package.json            # Database scripts & dependencies
│   ├── .env.example            # Database environment template
│   └── .gitignore              # Protects live credentials
├── frontend/                   # Canvas UI & avatar navigation (Member 2)
└── README.md                   # Main ecosystem documentation
```

---

## 🚀 Quickstart & Database Verification

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [MongoDB Atlas](https://cloud.mongodb.com/) account or local MongoDB instance

### 2. Environment Configuration
Copy the template file to `.env` inside the `database/` directory:

```bash
cd database
cp .env.example .env
```

Ensure `MONGODB_URI` contains your connection credentials:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.w15le4t.mongodb.net/proxispeak?retryWrites=true&w=majority
```

> **Security Note:** Never commit `.env` files containing live credentials. Both `database/` and `backend/` have `.gitignore` configured.

### 3. Run Verification Tests & Scripts

Execute the comprehensive test suites from the root directory or individual modules:

```bash
# Run live MongoDB Atlas movement persistence test (20 steps)
npm run test:live

# Run multi-client Socket.IO integration tests (9 scenarios)
npm run test:integration

# Run schema boundary & database validation test
npm run test:db

# Build frontend production bundle
npm run build:frontend
```

---
