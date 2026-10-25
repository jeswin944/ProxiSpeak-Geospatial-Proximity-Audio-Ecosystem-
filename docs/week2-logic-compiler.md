# ProxiSpeak Week 2 — Logic Compiler Specification & Audit Report

## 1. Executive Summary

The **ProxiSpeak Logic Compiler** is a high-performance Node.js execution engine designed to compile saved React Flow JSON graphs into asynchronous, reactive data pipelines using **RxJS Observables**. It bridges visual graph authoring with real-time reactive execution, ensuring strict safety, cycle detection, memory leak prevention, and sandboxed computation.

---

## 2. Compiler Architecture & Pipeline Flow

The compilation process adheres to a deterministic, five-stage pipeline:

```
┌────────────────────────┐
│ Saved React Flow JSON  │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│    Graph Validation    │  ◄── Node limits, supported types, edge ports
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Graph Analysis & Sort  │  ◄── Kahn's Algorithm: Cycle detection & DAG ordering
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Node Stream Synthesis  │  ◄── Safe RxJS operators (No eval(), pure functional)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Reactive RxJS Pipeline │  ◄── Start, observe, throttle, and teardown
└────────────────────────┘
```

### Module Organization
- `backend/src/compiler/nodeRegistry.js`: Central catalog defining supported node types, categories, port signatures, and config validators.
- `backend/src/compiler/graphValidator.js`: Structural, semantic, handle/port, and cycle validation.
- `backend/src/compiler/operators/`: Pure RxJS stream factories for Data Sources, Math Operations, and Action Triggers.
- `backend/src/compiler/graphCompiler.js`: Compiles validated DAGs into executable pipeline bundles with teardown hooks.
- `backend/src/services/graphExecutionService.js`: Singleton managing active execution lifecycles and historical run records.
- `backend/src/routes/graphRoutes.js`: Express REST API endpoints for graph validation, compilation, and execution.

---

## 3. Structural Validation & Cycle Detection

### Structural Guardrails
- **Node limit**: Maximum 200 nodes per graph.
- **Edge limit**: Maximum 500 edges per graph.
- **Node ID uniqueness**: Duplicate IDs are rejected with actionable errors.
- **Edge references**: Every edge must point to existing source and target node IDs.
- **Port validation**: Recognizes designated handles (`out`, `a`, `b`, `in`, `logged`, `alert`).

### Cycle Detection (DAG Enforcement)
Cycles in reactive streams cause unbounded feedback loops and memory leaks. The compiler implements **Kahn's Topological Sort Algorithm** using in-degree analysis:
1. Calculates in-degree (number of incoming edges) for every node.
2. Seeds a FIFO queue with all source nodes (in-degree = 0).
3. Iteratively resolves dependencies and decrements downstream in-degrees.
4. If the number of processed nodes does not match the total node count, a cycle is flagged and the nodes involved are returned in the validation error.

---

## 4. REST API Endpoints

The compiler is integrated into the Express server under `/api/graph`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/graph/nodes` | `GET` | Returns list of all registered node types, ports, and default configurations. |
| `/api/graph/validate` | `POST` | Validates graph structure, ports, and checks for cycles without executing. |
| `/api/graph/compile` | `POST` | Compiles graph into an in-memory pipeline instance. |
| `/api/graph/execute` | `POST` | Compiles and executes graph for a specified duration, returning logs and alerts. |
| `/api/graph/stop/:executionId` | `POST` | Stops an active stream execution and releases all RxJS subscriptions. |
| `/api/graph/status/:executionId` | `GET` | Returns real-time status and event counts for an execution. |
| `/api/graph/active` | `GET` | Lists all currently running executions. |

---

## 5. Automated Verification Results

All compiler features are verified using `backend/src/test-compiler.js`.

### Test Execution Command
```bash
cd backend
npm run test-compiler
```

### Actual Test Results
```
================================================================
       ProxiSpeak Week 2 — Logic Compiler Test Suite            
================================================================

✓ PASS: Valid DAG Pipeline Compilation & Execution — Compiled 3 nodes in topological order and computed 25*4=100
✓ PASS: Unknown Node Type Rejection — Correctly flagged unsupported node type
✓ PASS: Invalid Node Configuration Detection — Detected invalid math operation config
✓ PASS: Missing Edge Reference Detection — Correctly rejected edge referencing missing target
✓ PASS: Cycle Detection & DAG Enforcement — Correctly detected circular dependency loop [A, B, C]
✓ PASS: Multiple Independent Graph Executions — Executed parallel pipelines without state crossover
✓ PASS: Stream Teardown & Leak Prevention — Cleanly unsubscribed without continuing interval ticks

┌─────────┬──────────────────────────────────────────────┬──────────┬───────────────────────────────────────────────────────────────┐
│ (index) │ Test                                         │ Status   │ Details                                                       │
├─────────┼──────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────┤
│ 0       │ 'Valid DAG Pipeline Compilation & Execution' │ 'PASSED' │ 'Compiled 3 nodes in topological order and computed 25*4=100' │
│ 1       │ 'Unknown Node Type Rejection'                │ 'PASSED' │ 'Correctly flagged unsupported node type'                     │
│ 2       │ 'Invalid Node Configuration Detection'       │ 'PASSED' │ 'Detected invalid math operation config'                      │
│ 3       │ 'Missing Edge Reference Detection'           │ 'PASSED' │ 'Correctly rejected edge referencing missing target'          │
│ 4       │ 'Cycle Detection & DAG Enforcement'          │ 'PASSED' │ 'Correctly detected circular dependency loop [A, B, C]'       │
│ 5       │ 'Multiple Independent Graph Executions'      │ 'PASSED' │ 'Executed parallel pipelines without state crossover'         │
│ 6       │ 'Stream Teardown & Leak Prevention'          │ 'PASSED' │ 'Cleanly unsubscribed without continuing interval ticks'      │
└─────────┴──────────────────────────────────────────────┴──────────┴───────────────────────────────────────────────────────────────┘

🎉 ALL 7 LOGIC COMPILER TESTS PASSED!
```
