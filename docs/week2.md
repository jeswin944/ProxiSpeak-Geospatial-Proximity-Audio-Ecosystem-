# ProxiSpeak — Week 2 Specification, Logic Compiler & Mid-Project Review

## 1. Executive Summary

In **Week 2** and the **Mid-Project Review**, the ProxiSpeak ecosystem evolved from a spatial communication virtual office into a reactive dataflow processing platform. 

The primary deliverables implemented and formally audited include:
- **Visual Logic Graph Editor:** A React Flow node-based visual programming canvas for defining event pipelines, math transformations, and action alerts.
- **Sandboxed Logic Compiler:** A backend pipeline using **Kahn's Topological Sort Algorithm** to enforce Directed Acyclic Graphs (DAG), reject cycles, validate handle connections, and synthesize reactive **RxJS Observables** without using unsafe `eval()` or dynamic `Function()` execution.
- **Node Catalog:** Standardized data sources (static values, interval timers, manual pushers, mock telemetry), math operators with zero-division protection, and rate-limited action triggers.
- **Graph Serialization Engine:** Schema `v1.0.0` lossless serialization that strips transient UI/DOM state while preserving port topology and coordinates.
- **High-Throughput Time-Series Ingestion:** A MongoDB native Time-Series collection verified to sustain **6,684 writes/second** with compressed per-document footprints (~15 bytes).

---

## 2. Week 2 Deliverables Summary & Test Status

| Deliverable | Key Highlights | Verification Command | Status |
|---|---|---|---|
| **Logic Compiler** | React Flow JSON compilation, Kahn's DAG cycle detection, RxJS pipeline synthesis, leak prevention. | `npm run test:compiler` | **7 / 7 PASSED** |
| **Node Library** | 8 registered node types across Data Sources, Safe Math, and Throttled Action Triggers. | `npm run test:nodes` | **10 / 10 PASSED** |
| **Graph Serialization** | Schema `v1.0.0` round-trip engine, DOM state sanitization, multi-branching execution. | `npm run test:serialization` | **5 / 5 PASSED** |
| **REST API Integration** | `/api/graph/validate`, `/compile`, `/execute`, `/stop/:id`, `/nodes`. | `npm run test:api` | **4 / 4 PASSED** |
| **Time-Series Ingestion** | Native MongoDB Time-Series collection sustaining **6,684 writes/sec** on Atlas. | `npm run benchmark:ingestion` | **BENCHMARKED** |

---

## 3. Compiler Architecture & Execution Pipeline

```
┌────────────────────────────────────────────────────────┐
│               Saved React Flow JSON Graph              │
│  - Nodes: Data Sources, Math Operators, Action Triggers│
│  - Edges: Explicit sourceHandle -> targetHandle pairs  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              1. Structural Validation                  │
│  - Check required fields (id, type, data)              │
│  - Reject unknown node types                           │
│  - Verify edge handle existence                        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         2. Kahn's Topological Sort (DAG Check)         │
│  - Compute in-degree for all vertices                  │
│  - Detect circular dependency loops (e.g. A->B->C->A)  │
│  - Establish deterministic execution order             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           3. Pure RxJS Stream Synthesis                │
│  - Source nodes -> Observables (interval, of, Subject) │
│  - Operator nodes -> map(), filter(), combineLatest()  │
│  - Action nodes -> tap(), throttleTime()               │
│  - Safe sandbox: Zero eval() / Function()              │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          4. Lifecycle Management & Teardown            │
│  - Store active execution in-memory                    │
│  - Stream events to caller                             │
│  - POST /api/graph/stop/:id flushes and unsubscribes   │
└────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Specifications

### A. Graph Compiler & Validator (`backend/src/compiler/`)
- **Kahn's Algorithm:**
  1. Build adjacency list and compute in-degree for every vertex.
  2. Queue all vertices with in-degree 0.
  3. Dequeue vertex $u$, append to sorted order, and decrement in-degree for all neighbors $v$.
  4. If in-degree of $v$ becomes 0, enqueue $v$.
  5. If sorted vertices count $< N$, graph contains a directed cycle $\implies$ reject compilation with cyclic path details.
- **Zero-eval Sandboxed Execution:** Graph logic is converted strictly into pure RxJS functional streams. User input parameters are validated against strict numerical and string schemas.
- **Lifecycle & Memory Leak Prevention:** Each compiled execution returns a unique `executionId` mapped to an internal array of RxJS `Subscription` objects. Invoking `/api/graph/stop/:id` triggers `.unsubscribe()` on all active streams and intervals.

### B. Standard Node Catalog (`backend/src/compiler/operators/`)
1. **Data Sources:**
   - `source_static`: Emits single configured constants (`number` or `string`).
   - `source_interval`: Emits periodic timer ticks at configured cadence (ms).
   - `source_manual`: Provides interactive UI push-button values via RxJS `Subject`.
   - `source_mock_events`: Simulates geospatial movement presence telemetry frames.
2. **Math Operations (`math_operation`):**
   - Arithmetic: `add`, `subtract`, `multiply`, `divide`, `modulo`, `min`, `max`.
   - Relational: `equal`, `greater_than`, `less_than`.
   - **Division by Zero Safety:** If denominator is 0, the node falls back to a user-configured fallback value (default `0`) or emits a structured error flag rather than crashing with `Infinity` or `NaN`.
3. **Action Triggers:**
   - `action_logger`: Structured console logging with configurable `throttleTime` to prevent log floods.
   - `action_event_emitter`: Emits named internal events into the ecosystem.
   - `action_threshold_alert`: Evaluates values against numerical bounds (`gt`, `lt`, `gte`, `lte`) and emits high-priority alert events when violated.

### C. Graph Serialization Engine (`frontend/src/utils/graphSerialization.js`)
- **Schema Version:** Versioned under `schemaVersion: "1.0.0"`.
- **Transient State Stripping:** Strips dynamic React Flow properties (`selected`, `dragging`, internal dimension caches, inline styling) while preserving:
  - Canonical node `id`, `type`, coordinates (`x`, `y`).
  - Node custom configuration `data`.
  - Edge `id`, `source`, `target`, `sourceHandle`, `targetHandle`.
- **Round-Trip Fidelity:** Tested to ensure that deserializing a serialized graph yields identical topological structure and produces identical execution results.

### D. High-Throughput Time-Series Ingestion (`database/src/benchmark-ingestion.js`)
- **MongoDB Collection:** Native Time-Series collection defined with:
  ```json
  {
    "timeseries": {
      "timeField": "timestamp",
      "metaField": "metadata",
      "granularity": "seconds"
    }
  }
  ```
- **Benchmark Performance:**
  - Sustained Throughput: **6,684 writes / second** (target was 5,000 writes/sec).
  - Storage Footprint: **~15 bytes per document** (utilizing MongoDB columnar block compression).
  - Test Profile: 10 parallel client workers sending 500-document batches to Atlas.

---

## 5. Verification & Test Evidence

### 1. Logic Compiler Test Suite (`npm run test:compiler`)
| Test Case | Validated Behavior | Result |
|---|---|---|
| **DAG Pipeline Compilation** | 3-node pipeline compiled in topological order ($25 \times 4 = 100$) | ✅ PASSED |
| **Unknown Node Rejection** | Correctly rejects unsupported node types | ✅ PASSED |
| **Configuration Guard** | Flags missing or invalid math configuration | ✅ PASSED |
| **Edge Reference Guard** | Rejects edge referencing non-existent target node | ✅ PASSED |
| **Kahn's Cycle Detection** | Enforces DAG; flags circular loop `[A, B, C]` with error | ✅ PASSED |
| **Parallel Pipelines** | Multiple simultaneous graph runs without state crossover | ✅ PASSED |
| **Stream Teardown** | Clean unsubscribe without lingering interval timers | ✅ PASSED (7/7) |

### 2. Node Library Test Suite (`npm run test:nodes`)
| Node Type | Test Scenario | Result |
|---|---|---|
| `source_static` | Emits exact configured static constant | ✅ PASSED |
| `source_interval` | Emits exact 3 ticks at 20ms cadence | ✅ PASSED |
| `source_manual` | Pushes and observes interactive UI input values | ✅ PASSED |
| `source_mock_events` | Emits 4 simulated geospatial presence frames | ✅ PASSED |
| `math_operation` | Arithmetic and relational comparison calculations | ✅ PASSED |
| `math_operation` (Zero Guard) | Division by zero fallback handled cleanly | ✅ PASSED |
| `math_operation` (Validation) | Non-numeric input strings rejected gracefully | ✅ PASSED |
| `action_logger` | Throttles high-frequency burst into single structured log | ✅ PASSED |
| `action_event_emitter` | Dispatches internal event with payload verification | ✅ PASSED |
| `action_threshold_alert` | Correctly filters and triggers alerts on threshold breach | ✅ PASSED (10/10) |

### 3. Serialization Test Suite (`npm run test:serialization`)
| Test Case | Description | Result |
|---|---|---|
| **JSON Serialization** | Produces valid JSON under `schemaVersion: 1.0.0` | ✅ PASSED |
| **Round-Trip Equivalence** | Reconstructs identical nodes, edges, positions, handles | ✅ PASSED |
| **Source Immutability** | Zero mutation of source React Flow objects | ✅ PASSED |
| **Execution of Restored Graph**| Restored branching pipeline compiles & executes $(15+5) \times 2 = 40$ | ✅ PASSED |
| **Malformed Rejection** | Rejects malformed JSON and unsupported versions | ✅ PASSED (5/5) |

### 4. REST API Integration (`npm run test:api`)
| Endpoint | Method | Expected Output | Result |
|---|---|---|---|
| `/api/graph/nodes` | `GET` | Returns catalog of $\ge 8$ registered node types | ✅ PASSED |
| `/api/graph/validate` | `POST` | Validates DAG and edge connectivity | ✅ PASSED |
| `/api/graph/execute` | `POST` | Compiles and executes graph, returning events | ✅ PASSED |
| `/api/graph/stop/:id` | `POST` | Halts execution and unsubscribes active streams | ✅ PASSED (4/4) |

