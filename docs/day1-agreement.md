# Day 1 Cross-Team Architectural Agreement

**Project:** ProxiSpeak — Geospatial Proximity Audio Ecosystem  
**Target Delivery Date:** Day 1  
**Team Sync Date:** October 12, 2026  

---

## 1. Canvas Dimensions & Boundaries
- Agreed standard dimensions: **800 units (width) × 500 units (height)**.
- Origin point: `(0, 0)` is top-left corner.
- Member 2 (Canvas) renders strictly within `0 <= x <= 800` and `0 <= y <= 500`.
- Member 4 (Database) validates coordinates with Mongoose schema constraints:
  - `x`: `min: 0, max: 800`
  - `y`: `min: 0, max: 500`

---

## 2. Shared Data Models
- **Presence**:
  - `userId`: String
  - `officeId`: String
  - `x`: Number (0–800)
  - `y`: Number (0–500)
  - `isOnline`: Boolean
  - `lastSeen`: Date
  - Index: `{ officeId: 1, userId: 1 }` (unique compound index)
- **Office**:
  - `officeId`: String (unique)
  - `name`: String
  - `width`: 800
  - `height`: 500
  - `obstacles`: Array of obstacle definitions (`wall`, `desk`, `meeting_room`, etc.)

---

## 3. Communication Protocols
- Signaling server running on Node.js / Express (Port 3000).
- WebRTC peer connections established for spatial audio streaming.
- WebSocket / Socket.io events:
  - `user:join` -> registers user in office
  - `user:move` -> broadcasts updated `(x, y)` coordinates
  - `user:leave` -> sets `isOnline: false` or cleans up presence
