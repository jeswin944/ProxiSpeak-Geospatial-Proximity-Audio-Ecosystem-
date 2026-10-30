# ProxiSpeak — Week 1 Specification, Architecture & Verification

## 1. Executive Summary

**ProxiSpeak** is a geospatial proximity audio ecosystem combining a 2D virtual office canvas with real-time multiplayer positional audio, peer-to-peer WebRTC voice communication, and MongoDB Atlas persistence. 

During **Week 1**, the engineering team designed, implemented, and verified the core multi-client foundations:
- **Low-latency Movement Broadcast (60 FPS):** In-memory position synchronization over Socket.IO with room isolation.
- **High-DPI 2D Virtual Office Canvas:** An $800 \times 500$ pixel coordinate space with designated functional zones (Meeting Pods, Dev Clusters, Audio Lounge) and real-time visual proximity preview.
- **Pure Distance Attenuation & Spatial Audio:** Euclidean distance calculation with linear attenuation and Web Audio gain management.
- **Peer-to-Peer WebRTC Mesh Audio:** Decentralized audio streaming with Socket.IO signaling (`offer`, `answer`, `ice-candidate`).
- **MongoDB Atlas Presence Persistence:** Throttled (500ms) background writes with non-overlapping asynchronous locks and trailing flush to guarantee final avatar coordinates are persisted.

---

## 2. Team Member Deliverables & Breakdown

| Member / Role | Module | Primary Deliverables | Test Status |
|---|---|---|---|
| **Member 1** | **Backend & Real-Time Signaling** | Node.js + Express + Socket.IO server, room isolation (`officeId`), identity protection against spoofing, disconnect cleanup. | **9 / 9 PASSED** |
| **Member 2** | **Frontend Office Canvas** | HTML5 2D canvas ($800 \times 500$), Retina/DPR scaling, functional zones, 150px proximity aura, specular avatar drawing. | **VERIFIED** |
| **Member 3** | **Movement & WebRTC Spatial Audio** | WASD / Arrow keyboard navigation, mouse drag coordinate translation, WebRTC mesh peer management, `createSpatialAudioManager`. | **VERIFIED** |
| **Member 4** | **Database, Persistence & QA** | MongoDB Atlas `Presence` schema, 500ms throttled write lock with trailing flush, boundary validation ($0 \le x \le 800$, $0 \le y \le 500$), test suites. | **6 / 6 PASSED** (DB)<br>**19 / 19 PASSED** (Spatial) |

---

## 3. System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│               Client Browser (Frontend)                │
│  - React 18 + HTML5 Canvas ($800 \times 500$)          │
│  - Movement Controller (WASD / Mouse Click-and-Drag)   │
│  - Spatial Audio Manager (Web Audio API + GainNodes)   │
│  - WebRTC PeerConnections (RTCPeerConnection Mesh)     │
└───────────────────────────┬────────────────────────────┘
                            │
               WebSocket    │  avatar:move { x, y }
               (60 FPS)     │  presence:update
                            ▼
┌────────────────────────────────────────────────────────┐
│             Node.js + Socket.IO Backend Server         │
│  - Room Isolation: socket.join(officeId)               │
│  - Identity Authorization (reject mismatched userId)   │
│  - In-Memory Fast Cache: Map<userId, userState>        │
│  - WebRTC Signaling Relay (offer, answer, ICE)         │
└───────────────────────────┬────────────────────────────┘
                            │
               Atomic       │  Throttled 500ms
               Non-blocking │  Trailing stop flush
                            ▼
┌────────────────────────────────────────────────────────┐
│                 MongoDB Atlas Cluster                  │
│  - Presence Collection: Compound index {office, user}  │
│  - Coordinates & Status Cache (isOnline, lastSeen)     │
│  - Office Layout Document (dimensions & obstacles)     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Specifications

### A. Real-Time Signaling (`backend/src/socket/socketHandlers.js`)
- **Room Isolation:** Clients join office rooms via `socket.join(officeId)`. All position updates, joins, and departures are isolated to that office, preventing cross-room message leakage.
- **Identity Enforcement:** Incoming `avatar:move` events are strictly checked against `socket.data.userId`. If a client sends an ID different from their handshake authentication, the server emits `error:forbidden` and drops the packet.
- **Duplicate User Recovery:** If a user connects with an active session ID (e.g. duplicating a browser tab), the server emits `error:duplicate_user`, prompting the frontend to assign a fresh unique user ID.
- **Clean Disconnect:** When a socket disconnects, the server immediately informs room peers via `user:left`, releases in-memory state, and executes an asynchronous update setting `isOnline: false`.

### B. High-DPI Virtual Office Canvas (`frontend/src/components/OfficeCanvas.jsx`)
- **Internal Coordinates:** Canonical $800 \times 500$ unit space mapped cleanly to device pixels using `window.devicePixelRatio`.
- **Architectural Zones:**
  - *Meeting Pod A* ($30, 30, 200, 140$)
  - *Dev Cluster HQ* ($280, 80, 240, 160$)
  - *Audio Lounge* ($560, 280, 200, 180$)
- **Visual Feedback:** 150px radial gradient visual aura indicating local voice proximity range and interactive hover states.

### C. Positional Spatial Audio (`frontend/src/utils/spatialAudio.js` & `spatialAudioManager.js`)
- **Euclidean Distance Model:**
  $$\text{distance} = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
- **Linear Attenuation Function:**
  $$\text{gain} = \begin{cases} 0 & \text{if } \text{distance} \ge \text{maxDistance} \text{ or invalid} \\ 1 - \frac{\text{distance}}{\text{maxDistance}} & \text{if } 0 \le \text{distance} < \text{maxDistance} \end{cases}$$
  - $\text{maxDistance} = 300\text{ px}$.
  - At distance $0\text{ px} \implies \text{gain} = 1.000$ (full volume).
  - At distance $150\text{ px} \implies \text{gain} = 0.500$ (half volume).
  - At distance $\ge 300\text{ px} \implies \text{gain} = 0.000$ (silent).
- **Web Audio Pipeline:**
  - Each remote user has an isolated `GainNode` fed into a single shared `AudioContext` to respect browser audio limits.
  - Smooth volume transitions are executed using `gainNode.gain.setTargetAtTime(target, currentTime, 0.1)`.

### D. MongoDB Atlas Presence Schema (`backend/src/models/Presence.js`)
- **Schema Fields:**
  - `userId`: `String` (required, trimmed).
  - `officeId`: `String` (required, default `"office_1"`).
  - `x`: `Number` (required, bounded: $0 \le x \le 800$).
  - `y`: `Number` (required, bounded: $0 \le y \le 500$).
  - `isOnline`: `Boolean` (default `true`).
  - `lastSeen`: `Date` (default `Date.now`).
- **Compound Index:** `{ officeId: 1, userId: 1 }` with unique constraint.
- **Write Lock & Debounce:** Updates are debounced to at most 1 write per 500ms per user. An in-flight `isSaving` flag queues pending positions, and a trailing timer flushes the final stopping coordinate.

---

## 5. Verification & Test Evidence

### 1. Multi-Client Socket.IO Integration (`npm run test:integration`)
| Scenario | Target Behavior | Result |
|---|---|---|
| **1. Dual User Join** | Both users receive `presence:update` with peer info | ✅ PASSED |
| **2. Avatar Movement** | Peer client receives real-time position update (320, 240) | ✅ PASSED |
| **3. Concurrent Movement** | Multiple users move simultaneously without state cross-over | ✅ PASSED |
| **4. User Departure** | Client receives `user:left` and cleans up peer | ✅ PASSED |
| **5. Boundary Validation** | Server rejects coordinates exceeding boundaries ($x=1200, y=-90$) | ✅ PASSED |
| **6. DB Fail-safe** | Backend maintains real-time in-memory relay if DB drops | ✅ PASSED |
| **7. Room Isolation** | Updates in office A never leak to office B | ✅ PASSED |
| **8. Impersonation Defense** | Server rejects spoofed user ID with `error:forbidden` | ✅ PASSED |
| **9. Reconnect Deduplication**| Reconnected client replaces dead socket with exact 1 record | ✅ PASSED |

### 2. MongoDB Atlas Live Connection & Schema Validation (`npm run test:db`)
| Test Case | Description | Result |
|---|---|---|
| **Boundary Rejections** | Negative and out-of-bound coordinates ($x < 0, x > 800, y < 0, y > 500$) | ✅ PASSED (6/6) |
| **Atlas Live Connect** | Connects to `cluster0.15pqtub.mongodb.net` with authenticated credentials | ✅ PASSED |
| **Presence CRUD** | Inserts presence document, verifies coordinates, cleans up test doc | ✅ PASSED |
| **Office Persistence** | Inserts office layout with obstacles and reads back structure | ✅ PASSED |

### 3. Spatial Audio Math Suite (`npm run test:spatial`)
| Test Category | Test Cases Covered | Result |
|---|---|---|
| **Euclidean Distance** | Identical points ($0$), horizontal ($100$), vertical ($200$), diagonal ($500$), symmetry | ✅ PASSED |
| **Volume Attenuation** | Boundary conditions ($0, 75, 150, 225, 300, 400$), negative distance, custom range | ✅ PASSED |
| **Edge Cases & Safety** | `NaN`, `Infinity`, `maxDistance <= 0`, negative bounds clamped to $0$ | ✅ PASSED (19/19) |

