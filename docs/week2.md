# ProxiSpeak — Week 2 Specification & Logic Compiler Architecture

## 1. Overview & Objectives

In **Week 2** and the **Mid-Project Review**, the ProxiSpeak ecosystem was extended from a real-time virtual office into a reactive dataflow computation platform. The system introduces a visual **Logic Graph Editor** backed by a sandboxed **Logic Compiler** compiling visual graphs into pure functional **RxJS data streams**, alongside a high-throughput **MongoDB Time-Series Ingestion Engine**.

---

## 2. Core Week 2 Deliverables & Status

| Deliverable | Key Highlights | Test Status |
|---|---|---|
| **Logic Compiler** | React Flow JSON compilation, Kahn's DAG cycle detection, RxJS Observables, lifecycle teardown. | **7 / 7 PASSED** (`npm run test:compiler`) |
| **Node Library** | Data Sources, Math Operations (zero-division guard), and Action Triggers (rate-limited loggers). | **10 / 10 PASSED** (`npm run test:nodes`) |
| **Graph Serialization** | Schema v1.0.0 round-trip engine, DOM state sanitization, multi-branching execution. | **5 / 5 PASSED** (`npm run test:serialization`) |
| **End-to-End REST API** | `/api/graph/validate`, `/compile`, `/execute`, `/stop/:id`, `/nodes`. | **4 / 4 PASSED** (`npm run test:api`) |
| **Time-Series Ingestion** | Native MongoDB Time-Series collection sustaining **6,684 writes/second** (exceeding 5k target). | **VERIFIED** (`npm run benchmark:ingestion`) |

---

## 3. Compiler Pipeline & Cycle Detection

```
┌─────────────────────────────────┐
│     Saved React Flow JSON       │
│  - Nodes (Data, Math, Actions)  │
│  - Edges with Named Handles     │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Structural Validation       │
│  - Port type matching (in/out)  │
│  - Unknown node rejection       │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Kahn's Algorithm (DAG)      │
│  - In-degree dependency sort    │
│  - Cycle loop rejection [A,B,C] │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     RxJS Stream Synthesis       │
│  - Pure functional operators    │
│  - Zero eval() / Safe sandbox   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Active Execution Lifecycle    │
│  - Start, Observe, and Log      │
│  - Teardown & Unsubscribe       │
└─────────────────────────────────┘
```

---

## 4. Key Engineering Modules

### A. Logic Compiler (`backend/src/compiler/`)
* **Kahn's Topological Sort**: Computes in-degree for all vertices. If processed nodes $< N$, cyclic dependency is detected and compilation aborts cleanly with actionable errors.
* **Leak Prevention**: Every running execution retains all active RxJS `Subscription` references; calling `/api/graph/stop/:id` guarantees 100% teardown with zero leaking interval ticks.
* **Pure Operators**: Uses standard functional RxJS operators (`map`, `filter`, `throttleTime`, `combineLatest`) without dangerous `eval()` or `Function()` constructs.

### B. Visual Node Library (`frontend/src/components/GraphEditor/`)
* **Data Sources**:
  * `source_static`: Emits single configured constants.
  * `source_interval`: Periodic timer ticks.
  * `source_manual`: Interactive UI push button values.
  * `source_mock_events`: Geospatial proximity telemetry stream.
* **Math Operations**:
  * Arithmetic (`add`, `subtract`, `multiply`, `divide`, `modulo`, `min`, `max`).
  * Relational comparisons (`equal`, `greater_than`, `less_than`).
  * Division-by-zero safeguards with configurable fallback outputs.
* **Action Triggers**:
  * `action_logger`: Console output with configurable `throttleTime` rate limiting.
  * `action_event_emitter`: Dispatches internal event messages.
  * `action_threshold_alert`: Emits alerts when numeric values exceed critical thresholds.

### C. Graph Serialization (`frontend/src/utils/graphSerialization.js`)
* **Schema Versioning**: Formatted under `schemaVersion: "1.0.0"`.
* **State Stripping**: Strips transient React Flow UI flags (`selected`, `dragging`, computed DOM styles) while preserving exact coordinate positions, handles, and custom configurations.
* **Round-Trip Integrity**: Ensures serialized graphs can be restored and executed on any node without degradation.

### D. MongoDB High-Throughput Time-Series Ingestion (`database/src/benchmark-ingestion.js`)
* Leverages MongoDB native Time-Series collection (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`).
* Sustains **6,684 writes/second** across 10 concurrent streams with 500-document batches on live MongoDB Atlas.
* Average document size: **~15 bytes** (compressed).

---

## 5. Verification & Detailed Audit Reports

Detailed audit evidence is documented across:
* [Week 2 Logic Compiler Specification](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week2-logic-compiler.md)
* [Week 2 Node Library Specification](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week2-node-library.md)
* [Week 2 Completion Report](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/week2-completion-report.md)
* [Mid-Review: Graph Serialization Audit](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/mid-review-graph-serialization.md)
* [Mid-Review: MongoDB Ingestion Audit](file:///c:/Users/User/OneDrive/Desktop/ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem-/docs/mid-review-mongodb-ingestion-audit.md)

