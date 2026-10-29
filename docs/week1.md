# ProxiSpeak — Week 1 Specification & System Architecture

## 1. Overview & Objectives

**ProxiSpeak** is a geospatial proximity audio ecosystem combining a 2D virtual office canvas with real-time positional audio. During **Week 1**, the engineering team implemented and verified the foundation of real-time multi-avatar movement, WebSocket signaling, Web Audio spatial attenuation, and MongoDB Atlas persistence.

---

## 2. Team Member Breakdown & Core Responsibilities

| Role | Module | Key Deliverables |
|---|---|---|
| **Member 1** | **Backend & Real-time Signaling** | Node.js Express server, Socket.IO room isolation, avatar coordinate broadcasting, clean disconnect handling. |
| **Member 2** | **Frontend Office Canvas** | HTML5 Canvas 2D engine ($800 \times 500$ resolution), meeting pods, dev clusters, lounge areas, specular avatar rendering. |
| **Member 3** | **Avatar Navigation & Movement** | Keyboard WASD/Arrow navigation, mouse click-and-drag pathing, coordinate clamping ($0 \le x \le 800$, $0 \le y \le 500$), delta-time loop. |
| **Member 4** | **Database & Test Infrastructure** | MongoDB Atlas `Presence` schema, 500ms write throttling with non-overlapping locks, automated integration test suite (9 scenarios). |

---

## 3. Architecture & Data Flow

```
┌─────────────────────────────────┐
│     User Browser (Frontend)     │
│  - HTML5 Canvas ($800 \times 500$)  │
│  - WASD / Mouse Movement        │
│  - Web Audio Spatial Gain Node  │
└────────────────┬────────────────┘
                 │
      WebSocket  │  avatar:move { x, y }
      (60 FPS)   │  presence:update
                 ▼
┌─────────────────────────────────┐
│     Node.js + Socket.IO Server  │
│  - Room Isolation (`socket.join`)│
│  - Identity Authorization       │
│  - In-Memory State Broadcast    │
└────────────────┬────────────────┘
                 │
       Atomic    │  Throttled 500ms
       Non-block │  Trailing stop flush
                 ▼
┌─────────────────────────────────┐
│       MongoDB Atlas Cluster     │
│  - Presence Compound Index      │
│  - `{ officeId: 1, userId: 1 }` │
│  - Coordinates & Status Cache   │
└─────────────────────────────────┘
```

---

## 4. Key Engineering Modules

### A. Real-time Signaling (`backend/src/socket/socketHandlers.js`)
* **Room Isolation**: Sockets automatically join rooms via `socket.join(officeId)`. Movement coordinates broadcast solely to peers in the same office.
* **Identity Protection**: Sockets cannot impersonate other user IDs. If `userId !== socket.data.userId`, the server rejects the event with `error:forbidden`.
* **Clean Departure**: On socket disconnection, the server broadcasts `user:left` and immediately sets `isOnline: false` in MongoDB Atlas.

### B. High-DPI Virtual Office Canvas (`frontend/src/components/OfficeCanvas.jsx`)
* **Resolution**: $800 \times 500$ internal coordinate space rendered with high-DPI retina scaling.
* **Layout Zones**: Architectural grid, Meeting Pods, Engineering Clusters, Audio Lounges, and Boundary Walls.
* **Visuals**: Dynamic drop shadows, specular glow, and user nameplates.

### C. Positional Spatial Audio (`frontend/src/utils/spatialAudio.js`)
* **Euclidean Distance Model**:
  $$\text{distance} = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
* **Linear Distance Attenuation**:
  $$\text{gain} = \max\left(0, 1 - \frac{\text{distance}}{\text{maxDistance}}\right)$$
* Clamped between 0.0 (silent at $\ge 300$ units) and 1.0 (full volume at 0 distance).
* Stereo panning dynamically calculated based on horizontal displacement $(\Delta x)$.

### D. MongoDB Atlas Presence Schema (`backend/src/models/Presence.js`)
* **Compound Index**: `{ officeId: 1, userId: 1 }` (unique).
* **Write Throttling**: Updates are throttled to a minimum interval of 500ms. An atomic `isSaving` flag prevents overlapping asynchronous writes.
* **Trailing Stop Flush**: Ensures the avatar's final resting position is guaranteed to be saved to Atlas.

---

## 5. Verification & Test Evidence

All Week 1 functionality is backed by automated test suites:

* **Socket.IO Integration Suite** (`backend/src/test-integration.js`): **9 / 9 Scenarios Passed**.
* **MongoDB Atlas Persistence Suite** (`backend/src/test-db.js`): **6 / 6 Test Cases Passed**.
* **Spatial Audio Math Suite** (`frontend/src/tests/test-spatialAudio.js`): **19 / 19 Tests Passed**.
* Detailed audit report: [Week 1 Integration Test Report](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week1-integration-test-report.md).

