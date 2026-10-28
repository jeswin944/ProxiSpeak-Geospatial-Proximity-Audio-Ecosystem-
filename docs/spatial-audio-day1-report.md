# ProxiSpeak — Spatial Audio Day 1 Report
## Member 4 + Member 3 — Day 1 Implementation

**Date:** 2026-10-28
**Branch:** Jeswin
**Status:** ✅ Complete

---

## Table of Contents

1. [Day 1 Objectives](#1-day-1-objectives)
2. [Files Created or Modified](#2-files-created-or-modified)
3. [Distance and Volume Formulas](#3-distance-and-volume-formulas)
4. [Expected Output Table](#4-expected-output-table)
5. [WebRTC Audio Integration Design](#5-webrtc-audio-integration-design)
6. [Per-User GainNode Management](#6-per-user-gainnode-management)
7. [Spatial Audio Demo Panel](#7-spatial-audio-demo-panel)
8. [Test Commands and Actual Results](#8-test-commands-and-actual-results)
9. [Manual Two-User Testing Procedure](#9-manual-two-user-testing-procedure)
10. [Verified Results vs Untested Behavior](#10-verified-results-vs-untested-behavior)
11. [Remaining Issues and Blockers](#11-remaining-issues-and-blockers)

---

## 1. Day 1 Objectives

### Member 4 Objectives
| # | Task | Status |
|---|------|--------|
| M4-1 | Create `spatialAudio.js` utility with `calculateDistance()` and `calculateVolume()` | ✅ Done |
| M4-2 | Automated tests covering all edge cases (identical, horizontal, vertical, diagonal, boundary, negative, NaN, Inf, invalid max) | ✅ Done |
| M4-3 | Run tests and report actual results | ✅ Done — 19/19 passed |

### Member 3 Objectives
| # | Task | Status |
|---|------|--------|
| M3-1 | Create WebRTC audio pipeline manager with per-user GainNode | ✅ Done |
| M3-2 | Integrate remote WebRTC audio streams into existing application | ✅ Done |
| M3-3 | Connect avatar positions to per-user gain via spatial utility | ✅ Done |
| M3-4 | Add WebRTC signaling relay to backend Socket.IO server | ✅ Done |
| M3-5 | Add working spatial audio demonstration panel | ✅ Done |

---

## 2. Files Created or Modified

### Created
| File | Purpose |
|------|---------|
| `frontend/src/utils/spatialAudio.js` | Member 4 — Distance and volume attenuation utility (CJS) |
| `frontend/src/utils/spatialAudioManager.js` | Member 3 — Per-user WebRTC GainNode pipeline manager (ESM) |
| `frontend/src/tests/test-spatialAudio.js` | Member 4 — 19-case automated test suite (Node CJS) |
| `docs/spatial-audio-day1-report.md` | This document |

### Modified
| File | Change |
|------|--------|
| `frontend/src/components/RealtimeAvatarDemo.jsx` | Added WebRTC peer connections, spatial audio gain wiring, demo panel, mic controls |
| `backend/src/socket/socketHandlers.js` | Added WebRTC signaling relay (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`) |
| `package.json` | Added `test:spatial` script |

### Removed
| File | Reason |
|------|--------|
| `frontend/src/tests/test-spatialAudio.mjs` | Replaced by the CJS `.js` version for consistency with project test pattern |

---

## 3. Distance and Volume Formulas

### Euclidean Distance

```
distance = √((a.x − b.x)² + (a.y − b.y)²)
```

- Operates in 800×500 canvas pixel space (not geographic coordinates)
- Result is always ≥ 0
- Symmetric: `d(a, b) === d(b, a)`

### Linear Volume Attenuation

```
if (!isFinite(distance) || distance < 0 || maxDistance ≤ 0)
    volume = 0

if (distance ≥ maxDistance)
    volume = 0

volume = 1 - (distance / maxDistance)
```

- `maxDistance` defaults to **300 canvas units**
- Produces a gain in [0, 1]
- Gain of 1.0 = full volume; 0.0 = silent

---

## 4. Expected Output Table

| Distance (px) | Expected Gain | Verified |
|---:|---:|:---:|
| 0 | 1.000 | ✅ |
| 75 | 0.750 | ✅ |
| 150 | 0.500 | ✅ |
| 225 | 0.250 | ✅ |
| 300 | 0.000 | ✅ |
| 400 | 0.000 | ✅ |
| −50 | 0.000 | ✅ |
| NaN | 0.000 | ✅ |
| ∞ | 0.000 | ✅ |

---

## 5. WebRTC Audio Integration Design

### Architecture

```
Browser A                          Server (Node.js)            Browser B
─────────────────────              ───────────────────         ─────────────────────
RTCPeerConnection                  Socket.IO relay             RTCPeerConnection
  │                                  │                           │
  │── webrtc:offer ─────────────────►│── webrtc:offer ──────────►│
  │◄── webrtc:answer ────────────────│◄── webrtc:answer ─────────│
  │── webrtc:ice-candidate ─────────►│── webrtc:ice-candidate ───►│
  │◄── webrtc:ice-candidate ─────────│◄── webrtc:ice-candidate ───│
  │                                  │                           │
  │←────────── P2P audio stream ─────────────────────────────────│
```

### Key Design Decisions

1. **Server is a pure relay** — No SDP or ICE data is inspected server-side.
2. **Polite/impolite pattern** — The user with the lexicographically smaller `userId` initiates the offer to avoid offer collisions on simultaneous joins.
3. **Single AudioContext** — One shared context per browser tab avoids the browser's ~6 context limit.
4. **Duplicate prevention** — `connectRemoteStream()` checks whether the exact same `MediaStream` is already connected before creating a new pipeline.
5. **Autoplay policy** — `AudioContext` is created lazily. `ensureResumed()` is called on any user gesture (key press, pointer event, mic button click).

### STUN Servers Used
```
stun:stun.l.google.com:19302
stun:stun1.l.google.com:19302
```

> [!NOTE]
> No TURN server is configured. Audio may fail to connect between devices behind strict symmetric NAT. For production, add a TURN server.

---

## 6. Per-User GainNode Management

### Audio Pipeline Per Remote User

```
MediaStreamAudioSourceNode
        │
        ▼
    GainNode  ← gain.gain.setTargetAtTime(volume, currentTime, 0.1)
        │
        ▼
AudioContext.destination
```

### Lifecycle

| Event | Action |
|-------|--------|
| Remote track received (`ontrack`) | `connectRemoteStream(userId, stream)` creates source + gain, connects to destination |
| Local avatar moves | `updateAllGains()` recalculates distance/volume for all remote users, calls `setGain(userId, volume)` |
| Remote avatar moves (`presence:update`) | Same `updateAllGains()` triggered via React `useEffect([position, users])` |
| User disconnects (`user:left`) | `cleanupPeer(userId)` closes RTCPeerConnection + `disconnectUser(userId)` disconnects/removes gain nodes |
| Component unmounts | `audioManager.destroy()` closes all nodes and the AudioContext |

### Gain Smoothing

```javascript
gain.gain.setTargetAtTime(volume, context.currentTime, 0.1)
```

- Time constant: **100ms** — gain ramps smoothly rather than clicking
- Moving one remote user does **not** affect any other user's gain

---

## 7. Spatial Audio Demo Panel

The **🔊 Spatial Audio — Live Gain Monitor** panel is built directly into `RealtimeAvatarDemo.jsx`:

- Shows local avatar coordinates
- For each remote user, shows:
  - Remote position (x, y)
  - Distance in canvas pixels
  - Target gain (0.000–1.000)
  - Visual gain bar (color-coded: green > 66%, yellow > 33%, red > 0%, grey = silent)
  - Audio stream connection status (● Connected / ○ No stream)
- Updates in real time as avatars move

---

## 8. Test Commands and Actual Results

### Spatial Audio Utility Tests (Member 4)

```bash
node frontend/src/tests/test-spatialAudio.js
```

**Actual output (2026-10-28):**
```
================================================================
  ProxiSpeak Day 1 — Spatial Audio Utility Test Suite (Member 4)
================================================================

✓ PASS: Distance — Identical positions — distance = 0
✓ PASS: Distance — Horizontal — distance = 100
✓ PASS: Distance — Vertical — distance = 200
✓ PASS: Distance — Diagonal (3-4-5) — distance = 500
✓ PASS: Distance — Symmetry — d(a,b)=141.42 === d(b,a)=141.42
✓ PASS: Volume — Distance 0 — gain = 1
✓ PASS: Volume — Distance 75 — gain = 0.75
✓ PASS: Volume — Distance 150 — gain = 0.5
✓ PASS: Volume — Distance 225 — gain = 0.25
✓ PASS: Volume — Distance 300 (boundary) — gain = 0
✓ PASS: Volume — Distance 400 (beyond max) — gain = 0
✓ PASS: Volume — Negative distance — gain = 0
✓ PASS: Volume — NaN distance — gain = 0
✓ PASS: Volume — Infinite distance — gain = 0
✓ PASS: Volume — maxDistance = 0 — gain = 0
✓ PASS: Volume — Negative maxDistance — gain = 0
✓ PASS: Volume — NaN maxDistance — gain = 0
✓ PASS: Volume — Custom maxDistance — gain = 0.5
✓ PASS: End-to-end — distance→volume — d=150, gain=0.5

Results: 19 passed, 0 failed, 19 total

All spatial audio utility tests passed ✓
```

### Existing Backend Tests (unchanged results)

```bash
node backend/src/test-compiler.js
# Result: 7/7 PASSED — Logic Compiler

node backend/src/test-nodes.js
# Result: 10/10 PASSED — Node Library

node backend/src/test-serialization.js
# Result: 5/5 PASSED — Graph Serialization
```

### Frontend Production Build

```bash
npm run build --prefix frontend
```

**Actual output:**
```
vite v8.3.4 building client environment for production...
✓ 212 modules transformed.
dist/index.html            0.40 kB
dist/assets/index.css     19.03 kB
dist/assets/index.js     477.79 kB

✓ built in 192ms
```

**Exit code: 0 — No errors, no warnings.**

---

## 9. Manual Two-User Testing Procedure

To verify actual spatial audio attenuation with real WebRTC audio:

### Requirements
- Two devices or browsers on the same network (or with TURN for remote)
- Backend server running: `npm run start:backend`
- Frontend dev server: `npm run start:frontend`
- Microphone access on both browsers

### Steps

1. **Browser A** — Open `http://localhost:5173`, note your User ID.
2. **Browser B** — Open `http://localhost:5173` in an incognito window or different browser.
3. On **both** browsers, click **"🎙️ Start Mic & Enable WebRTC"** to grant microphone access and initiate WebRTC.
4. Speak into microphone of Browser A. You should hear it in Browser B.
5. In **Browser A**, move your avatar close to Browser B's avatar.
   - At distance 0: perceived volume should be **maximum** (gain ≈ 1.000)
6. Move Browser A's avatar to 150px away from Browser B's avatar.
   - Gain panel should show **0.500**; perceived volume should be noticeably quieter.
7. Move Browser A's avatar to 300px+ away.
   - Gain panel should show **0.000**; Browser B should be **silent**.
8. Open a 3rd tab (Browser C), also grant mic. Verify that:
   - Moving Browser C's avatar does not affect Browser A↔B volume
   - Each remote user has its own independent gain bar

### Expected Gain Values During Manual Test

| Avatar Separation | Gain Panel (Browser B) | Expected Audio |
|---|---|---|
| 0 px | 1.000 | Full volume |
| 75 px | 0.750 | Noticeably quieter |
| 150 px | 0.500 | Half volume |
| 225 px | 0.250 | Quarter volume |
| ≥ 300 px | 0.000 | Silent |

---

## 10. Verified Results vs Untested Behavior

### ✅ Verified (automated tests + build)

| Item | Verification Method |
|------|---------------------|
| `calculateDistance()` — all cases | 19 automated tests, exit 0 |
| `calculateVolume()` — all cases including boundary, negative, NaN, Inf | 19 automated tests, exit 0 |
| End-to-end distance→gain pipeline | Test 19 |
| WebRTC signaling relay (server) | Code review of socketHandlers.js |
| Per-user GainNode isolation | Code review — each userId has its own Map entry |
| Frontend production build | Vite v8.3.4, 212 modules, 0 errors |
| Existing tests not broken | 7+10+5 = 22 backend tests all still pass |

### ⚠️ Not Verified (requires live two-user browser session)

| Item | Reason | Limitation |
|------|--------|-----------|
| Actual perceived audio attenuation | Requires two browsers with mics + WebRTC | Browser API not available in Node.js test environment |
| RTCPeerConnection establishment | Requires two browsers | Cannot be unit-tested |
| ICE negotiation with STUN servers | Requires network access and two peers | Not testable in this environment |
| Mute/unmute functionality | No mute UI yet (microphone stream can be stopped) | Future Day 2 work |
| Audio not duplicated on reconnect | Covered by code guard (`if existing.stream === stream return`) | Not integration-tested |
| TURN fallback for symmetric NAT | No TURN configured | Known gap |

> [!IMPORTANT]
> **The displayed gain number is the computed target value sent to the GainNode. It is NOT proof of actual audio attenuation.** Actual perceived volume change requires two real browser sessions with microphone access and a successfully established WebRTC P2P connection.

---

## 11. Remaining Issues and Blockers

| ID | Issue | Priority | Notes |
|----|-------|----------|-------|
| B1 | No mute/unmute button | Medium | Member 3 Day 2 |
| B2 | No TURN server configured | High | Audio will fail across strict NAT / different networks |
| B3 | WebRTC not tested with real two browsers | Medium | Manual test procedure documented in §9 |
| B4 | Audio does not yet handle mid-session track replacement (renegotiation) | Low | Rare edge case; cleanupPeer handles closed/failed states |
| B5 | `spatialAudioManager.js` uses `export` (ESM) while `spatialAudio.js` uses `module.exports` (CJS) | Low | Both work correctly in Vite build; only affects direct Node.js import |

---

## Quick Reference — Run Commands

```bash
# Spatial audio utility tests (Member 4)
node frontend/src/tests/test-spatialAudio.js

# All backend logic tests (unchanged from Week 2)
node backend/src/test-compiler.js
node backend/src/test-nodes.js
node backend/src/test-serialization.js

# Frontend production build
npm run build --prefix frontend

# Start the full application
npm run start:backend     # Terminal 1 — Node.js + Socket.IO on :3000
npm run start:frontend    # Terminal 2 — Vite dev server on :5173

# Root-level shortcut
npm run test:spatial
```
