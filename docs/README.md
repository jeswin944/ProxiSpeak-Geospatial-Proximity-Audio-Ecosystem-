# ProxiSpeak — Master Documentation Hub

Welcome to the central documentation and engineering audit directory for the **ProxiSpeak Geospatial Proximity Audio Ecosystem**. This index organizes system specifications, architectural diagrams, API contracts, and formal verification reports across all milestones.

---

## 🚀 Quickstart & How to Run

### Run the Full Ecosystem (Backend + Frontend)
Launch both the Express/Socket.IO backend and the React/Vite frontend concurrently:
```bash
npm run dev
# OR: node run-ecosystem.js
```
* **Virtual Office & Graph Editor**: [http://localhost:5173](http://localhost:5173)
* **Backend Signaling & API**: [http://localhost:3000](http://localhost:3000)

### Run Individual Services
* Backend only: `npm run start:backend`
* Frontend only: `npm run start:frontend`

### Run Verification Test Suites
| Milestone / Module | Command | Description |
|---|---|---|
| **All Test Suites** | `npm run test:all` | Sequentially executes all verification suites. |
| **Week 2 Logic Compiler** | `npm run test:compiler` | Kahn's algorithm cycle detection & RxJS pipeline execution. |
| **Week 2 Node Library** | `npm run test:nodes` | Data sources, zero-division math guards, and action triggers. |
| **Mid-Review Serialization** | `npm run test:serialization` | Schema v1.0.0 JSON serialization round-trips. |
| **REST API Integration** | `npm run test:api` | End-to-end graph compilation and execution endpoints. |
| **Socket.IO Integration** | `npm run test:integration` | Multi-client real-time movement and room isolation. |
| **MongoDB Atlas Persistence** | `npm run test:db` | Schema boundary constraints and live Atlas CRUD. |
| **Spatial Audio Math** | `npm run test:spatial` | Distance attenuation and stereo panning math. |
| **Ingestion Benchmark** | `npm run benchmark:ingestion` | 5,000+ writes/sec MongoDB Time-Series ingestion benchmark. |

---

## 📑 Week 1 Documentation & Deliverables

* **[Week 1 Master Specification](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week1.md)**:
  - System architecture for 2D Canvas and real-time Socket.IO movement signaling.
  - Team member roles and breakdown.
  - Spatial audio Euclidean distance attenuation and stereo panning models.
  - MongoDB Atlas `Presence` schema and 500ms write throttling with non-overlapping locks.
* **[Week 1 Integration Test Report](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week1-integration-test-report.md)**:
  - 9 multi-client Socket.IO integration scenarios (room isolation, coordinate bounds, reconnect deduplication).
  - 20-step live MongoDB Atlas movement persistence audit.
* **[Spatial Audio Day 1 Report](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/spatial-audio-day1-report.md)**:
  - Web Audio API integration and unit test evidence (19/19 passed).

---

## ⚡ Week 2 Documentation & Deliverables

* **[Week 2 Master Specification](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week2.md)**:
  - Architecture of the Logic Compiler compiling React Flow JSON to RxJS Observables.
  - Kahn's algorithm cycle detection (DAG enforcement).
  - Memory leak prevention and complete stream teardown hooks.
* **[Week 2 Logic Compiler Specification](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week2-logic-compiler.md)**:
  - Deep dive into graph validation, topological sorting, and pure functional RxJS synthesis.
  - Automated test suite results (7/7 passed).
* **[Week 2 Node Library Specification](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week2-node-library.md)**:
  - Custom node definitions: Data Sources, Math Operations, Action Triggers.
  - Automated test suite results (10/10 passed).
* **[Week 2 Completion Report](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week2-completion-report.md)**:
  - Formal audit evidence, cross-platform build verification, and benchmark wiring.

---

## 📊 Mid-Project Review & Ingestion Audits

* **[Mid-Project Review: Graph Serialization Audit](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/mid-review-graph-serialization.md)**:
  - Schema v1.0.0 versioned serialization engine.
  - Elimination of transient DOM state and preservation of port IDs and coordinates.
  - Restored complex branching execution evidence (5/5 passed).
* **[Mid-Project Review: MongoDB Ingestion Audit & Benchmark](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/mid-review-mongodb-ingestion-audit.md)**:
  - High-throughput Time-Series benchmark results: **6,684 writes/second** achieved against live MongoDB Atlas.
  - Storage footprint analysis: **~15 bytes per document** average.

---

## 🗄️ Database Schemas & Models

1. **`Presence`** (`backend/src/models/Presence.js`):
   - Real-time avatar coordinates inside office spaces.
   - Bounded to canvas dimensions ($0 \le x \le 800$, $0 \le y \le 500$).
   - Compound unique index: `{ officeId: 1, userId: 1 }`.
2. **`Office`** (`backend/src/models/Office.js`):
   - Office layout geometry, meeting pods, dev clusters, and obstacle barriers.
3. **`User`** (`backend/src/models/User.js`):
   - Persistent user profile information, color tags, and preferences.
4. **`TelemetryEvent`** (`backend/src/models/TelemetryEvent.js`):
   - Native MongoDB Time-Series collection optimized for high-frequency motion ingestion.
