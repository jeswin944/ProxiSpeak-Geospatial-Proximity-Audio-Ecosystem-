# Day 3 Deliverable — MongoDB Atlas & Integration Testing Report

**Role:** Member 4 — MongoDB Atlas, Schemas & Integration Testing  
**Project:** ProxiSpeak — Geospatial Proximity Audio Ecosystem  
**Date:** October 15, 2026  
**Status:** ✅ Completed & Verified  

---

## 1. Executive Summary

All Day 3 deliverables have been implemented, tested, and verified:
1. **MongoDB Atlas Connection Verified**: Live cluster connection established using environment variables with timeout handling and automatic reconnection.
2. **Schemas Completed & Enforced**: `Presence`, `Office` (Office Layout with obstacles), and `User` Mongoose models with strict boundary validation (0–800 X, 0–500 Y).
3. **Database Operations Tested**: Unit tests verify insertion, retrieval, coordinate checks, and rejection of invalid data.
4. **Integration Testing Completed**: All 5 scenarios executed and passed with Socket.IO test clients.
5. **Member 1 Coordination on Persistence Strategy**: Aligned on in-memory state for low-latency live position broadcasting, with asynchronous MongoDB persistence for join/leave events.

---

## 2. Task 1: MongoDB Connection & Configuration

- **Atlas Cluster**: Connected to MongoDB Atlas cluster `ac-6nq1jw8-shard-00-01.w15le4t.mongodb.net`.
- **Active Database**: `proxispeak`.
- **Environment Configuration**: Loaded from `backend/.env` using `dotenv.config()`.
  - Credentials: `MONGODB_URI=mongodb+srv://...` (excluded from git via `.gitignore`).
- **Connection Error & Timeout Handling**:
  - `serverSelectionTimeoutMS: 5000` configured in `backend/src/config/db.js`.
  - Try/catch wraps connection; failures report informative diagnostics without crashing unexpectedly.
  - Presence updates in socket handlers verify `mongoose.connection.readyState === 1` before persisting, guaranteeing zero blocking on the WebSocket event loop.

---

## 3. Task 2: Schema Models & Office Layout Documentation

### Presence Schema (`backend/src/models/Presence.js`)
| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `userId` | String | Yes | Unique per office | Unique identifier for the user |
| `officeId` | String | Yes | Indexed | Target office space |
| `x` | Number | Yes | `min: 0, max: 800` | X-coordinate on office canvas |
| `y` | Number | Yes | `min: 0, max: 500` | Y-coordinate on office canvas |
| `isOnline` | Boolean | No | Default: `true` | Real-time connectivity state |
| `lastSeen` | Date | No | Default: `Date.now` | Timestamp of last activity |

Compound Index: `{ officeId: 1, userId: 1 }` (unique).

### Office Layout Schema (`backend/src/models/Office.js`)
| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `officeId` | String | Yes | Unique, Indexed | Unique room identifier |
| `name` | String | Yes | Trimmed | Human-readable office name |
| `width` | Number | Yes | Default: `800` | Office canvas width in pixels |
| `height` | Number | Yes | Default: `500` | Office canvas height in pixels |
| `obstacles` | Array | No | Sub-schema | List of obstacles and collision zones |
| `createdAt` | Date | No | Default: `Date.now` | Timestamp created |
| `updatedAt` | Date | No | Default: `Date.now` | Timestamp updated |

#### Obstacle Sub-Schema
- `obstacleId`: String (required)
- `type`: Enum `["wall", "desk", "meeting_room", "lounge", "door", "custom"]`
- `label`: String
- `x`: Number (0–800)
- `y`: Number (0–500)
- `width`: Number
- `height`: Number

---

## 4. Task 3: Database Operations & Validation Test Results

Automated tests in `backend/src/test-db.js` (`npm run test-db`):

| Test # | Test Description | Input / Action | Result | Status |
|---|---|---|---|---|
| 1 | Atlas Connection | Connect with `MONGODB_URI` from `.env` | Successfully connected to Atlas | ✅ PASS |
| 2 | Document Insert | Insert valid Presence `(x: 350, y: 220)` | Saved with generated `_id` | ✅ PASS |
| 3 | Document Readback | Query by `userId` and `officeId` | Retrieved and coordinates match `(350, 220)` | ✅ PASS |
| 4a | Negative X Coordinate | `x: -20, y: 100` | Schema validation rejected input | ✅ PASS |
| 4b | X Out-of-Bounds | `x: 850 > 800, y: 100` | Schema validation rejected input | ✅ PASS |
| 4c | Negative Y Coordinate | `x: 100, y: -5` | Schema validation rejected input | ✅ PASS |
| 4d | Y Out-of-Bounds | `x: 100, y: 550 > 500` | Schema validation rejected input | ✅ PASS |
| 4e | Missing `officeId` | `{ userId: '...', x: 100, y: 100 }` | Schema validation rejected input | ✅ PASS |
| 4f | Missing `userId` | `{ officeId: '...', x: 100, y: 100 }` | Schema validation rejected input | ✅ PASS |
| 5 | Office Layout Verification | Insert office with 2 obstacles | Layout dimensions & obstacles read back | ✅ PASS |
| 6 | Database Cleanup | Delete temporary test documents | Documents removed cleanly from Atlas | ✅ PASS |

**Score: 6/6 Passed**

---

## 5. Task 4: Integration Testing Results Matrix

Automated test runner in `backend/src/test-integration.js` (`npm run test-integration`):

| # | Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | Two users join one office | Both appear | User A and User B received `presence:update` containing both avatars | ✅ PASSED |
| 2 | One user moves | Other browser receives the position | User A moved to `(320, 240)`; User B received updated coordinates | ✅ PASSED |
| 3 | A user disconnects | Their avatar disappears | User B disconnected; User A received `user:left` event for `user_B` | ✅ PASSED |
| 4 | Invalid coordinates are sent | Server rejects them | User A sent `(1200, -90)`; server rejected move and emitted `error:invalid_coordinates` | ✅ PASSED |
| 5 | MongoDB is unavailable | Backend reports connection failure | Server caught unreachable host with timeout and reported error | ✅ PASSED |

**Score: 5/5 Passed**

---

## 6. Task 5: Coordination with Member 1 (Persistence Strategy)

- **Strategy**: Dual-layer state management for Week 1:
  1. **In-Memory Live Broadcast (Fast-path)**: High-frequency movements (`avatar:move` at 60fps) are tracked in Node.js memory (`users = new Map()`) and broadcast via Socket.IO rooms. **No synchronous database writes occur on movement ticks**, eliminating I/O bottlenecks and latency spikes.
  2. **MongoDB Asynchronous Persistence (Slow-path)**:
     - On `user:join`: Upsert `Presence` with `isOnline: true`, initial coordinates, and `lastSeen: Date.now()`.
     - On `disconnect`: Update `Presence` with `isOnline: false`, final coordinates, and `lastSeen: Date.now()`.
     - Non-blocking: DB queries are executed asynchronously without impeding websocket message delivery.

---

## 7. Frontend Bug Fixes Completed

1. **`RealtimeAvatarDemo.jsx`**: Removed stray syntax error `bu*` on line 1; corrected title formatting.
2. **`OfficeCanvas.jsx`**: Created missing component with canvas grid, designated office zones (Meeting Room, Lounge, Workstations), avatar rendering, and user identity tags.
3. **Frontend Build**: Configured `vite.config.mjs` and installed dependencies; `npm run build` succeeds cleanly with 0 errors.
