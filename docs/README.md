# ProxiSpeak — Master Documentation Hub

Welcome to the central documentation directory for the **ProxiSpeak Geospatial Proximity Audio Ecosystem**. This index organizes the architectural specifications, system designs, and verification results.

---

## 🚀 Quickstart & Commands

### Run Full Ecosystem (Backend + Frontend)
```bash
npm run dev
# OR: node run-ecosystem.js
```
- **Virtual Office & Logic Graph Editor**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Socket.IO**: [http://localhost:3000](http://localhost:3000)

### Run Individual Services
- **Backend Server**: `npm run start:backend`
- **Frontend App**: `npm run start:frontend`

### Run Verification Test Suites
| Milestone / Module | Command | Description |
|---|---|---|
| **All Backend Tests** | `npm run test:all` | Sequentially executes all verification test suites. |
| **Week 1 Multi-Client Integration** | `npm run test:integration` | 9-scenario Socket.IO room isolation & movement tests. |
| **Week 1 MongoDB Atlas Persistence** | `npm run test:db` | Schema boundary constraints and live Atlas CRUD. |
| **Week 1 Spatial Audio Math** | `npm run test:spatial` | 19-case Euclidean distance and gain attenuation tests. |
| **Week 2 Logic Compiler** | `npm run test:compiler` | Kahn's algorithm cycle detection & RxJS pipeline execution. |
| **Week 2 Node Library** | `npm run test:nodes` | Data sources, zero-division math guards, and action triggers. |
| **Week 2 Graph Serialization** | `npm run test:serialization` | Schema v1.0.0 JSON serialization round-trips. |
| **Week 2 REST API Integration** | `npm run test:api` | End-to-end graph compilation and execution endpoints. |
| **Time-Series Ingestion Benchmark** | `npm run benchmark:ingestion` | 5,000+ writes/sec MongoDB Time-Series ingestion benchmark. |

---

## 📑 Milestone Documentation

### 🏢 [Week 1 — Geospatial Office & Spatial Audio Specification](./week1.md)
Detailed specification and verification evidence for Week 1:
- **Real-Time Signaling:** Express + Socket.IO server, room isolation (`officeId`), identity protection, and disconnect handling.
- **Office Canvas Engine:** HTML5 2D Retina-scaled canvas ($800 \times 500$), architectural zones, and 150px proximity preview.
- **Spatial Audio & WebRTC:** Euclidean distance model, linear attenuation, Web Audio GainNodes, and mesh WebRTC audio streaming.
- **MongoDB Atlas Persistence:** Compound index `{ officeId: 1, userId: 1 }`, 500ms throttled writes with non-overlapping locks, and trailing stop flush.
- **Verification Evidence:** 9/9 Socket.IO integration tests, 6/6 MongoDB Atlas CRUD tests, and 19/19 spatial audio tests passed.

---

### ⚡ [Week 2 — Logic Compiler & Reactive Architecture Specification](./week2.md)
Detailed specification and verification evidence for Week 2 & Mid-Project Review:
- **Visual Logic Graph Editor:** React Flow node-based interface for constructing event and dataflow pipelines.
- **Sandboxed Logic Compiler:** Kahn's topological sort algorithm for DAG enforcement, structural validation, and pure functional RxJS Observables synthesis (zero `eval()`).
- **Standard Node Library:** Data Sources (static, interval, manual, mock telemetry), Safe Math Operators (with division-by-zero guards), and Action Triggers.
- **Graph Serialization Engine:** Schema `v1.0.0` lossless serialization, transient UI state stripping, and branch execution.
- **High-Throughput Time-Series Ingestion:** Native MongoDB Time-Series collection sustaining **6,684 writes/second** with compressed per-document storage (~15 bytes).
- **Verification Evidence:** 7/7 compiler tests, 10/10 node tests, 5/5 serialization tests, and 4/4 REST API tests passed.

---

## 🗄️ Database Schemas & Models

1. **`Presence`** (`backend/src/models/Presence.js`):
   - Real-time avatar coordinates inside office spaces ($0 \le x \le 800$, $0 \le y \le 500$).
   - Compound unique index: `{ officeId: 1, userId: 1 }`.
2. **`Office`** (`backend/src/models/Office.js`):
   - Office layout geometry, meeting pods, dev clusters, and obstacle barriers.
3. **`User`** (`backend/src/models/User.js`):
   - Persistent user profile information, color tags, and preferences.
4. **`TelemetryEvent`** (`backend/src/models/TelemetryEvent.js`):
   - Native MongoDB Time-Series collection optimized for high-frequency motion ingestion.
