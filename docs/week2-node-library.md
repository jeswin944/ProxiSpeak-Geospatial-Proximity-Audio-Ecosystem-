# ProxiSpeak Week 2 — Node Library Specification & Verification

## 1. Overview

The **ProxiSpeak Node Library** provides a modular, type-safe suite of visual building blocks for constructing reactive graph pipelines. The library is categorized into three core domains:
1. **Data Sources** (Ingestion & Generators)
2. **Math Operations** (Arithmetic & Logic Transformations)
3. **Action Triggers** (Sinks, Alerts, & Event Dispatchers)

All nodes adhere to shared contracts between the frontend React Flow editor and the backend Node.js Logic Compiler.

---

## 2. Supported Node Types & Specifications

### Category 1: Data Sources
| Type | Label | Inputs | Outputs | Description | Configuration |
|------|-------|--------|---------|-------------|---------------|
| `source_static` | Static Value | None | `out` | Emits a constant numeric or string value. | `{ value: 10 }` |
| `source_interval` | Interval Timer | None | `out` | Emits periodic ticks or timestamps at a defined interval (ms). | `{ intervalMs: 500, maxTicks: 10 }` |
| `source_manual` | Manual Input | None | `out` | Interactive push input via an RxJS Subject. | `{ initialValue: null }` |
| `source_mock_events` | Mock Telemetry | None | `out` | Emits simulated coordinates and proximity frames. | `{ eventCount: 5, intervalMs: 100 }` |

### Category 2: Math Operations
| Type | Label | Inputs | Outputs | Description | Configuration |
|------|-------|--------|---------|-------------|---------------|
| `math_operation` | Math Operation | `a`, `b` | `out` | Applies safe mathematical/relational operations on inputs. | `{ operation: 'add' \| 'subtract' \| 'multiply' \| 'divide' \| 'min' \| 'max' \| 'compare_gt' \| 'compare_lt' \| 'compare_eq', defaultB: 0, fallbackOnZero: 0 }` |

#### Division by Zero Safety
Division by zero is guarded by default:
- Instead of returning `Infinity` or crashing the thread, the operator emits a configured fallback value (e.g. `0` or `null`) and logs an execution warning.
- Strict error mode can be toggled via `throwOnZero: true`.

### Category 3: Action Triggers
| Type | Label | Inputs | Outputs | Description | Configuration |
|------|-------|--------|---------|-------------|---------------|
| `action_logger` | Structured Logger | `in` | `logged` | Formats and records debug/audit log entries with optional rate-limiting. | `{ prefix: '[GRAPH-LOG]', throttleMs: 50 }` |
| `action_event_emitter` | Event Dispatcher | `in` | `emitted` | Dispatches validated internal events to registered handlers. | `{ eventName: 'proxispeak:event' }` |
| `action_threshold_alert` | Threshold Alert | `in` | `alert` | Emits an alert payload when an input value exceeds a threshold. | `{ threshold: 100, comparison: 'gt' }` |

---

## 3. Frontend React Flow Custom Components

Frontend components are located in `frontend/src/components/GraphEditor/`:
- `DataSourceNode.jsx`: Handles input value editing, interval timing, and emits through port `out`.
- `MathOperationNode.jsx`: Exposes two incoming handle ports (`a` and `b`), operation dropdown, and safety indicators.
- `ActionTriggerNode.jsx`: Exposes incoming handle port (`in`), configuration fields (throttle, threshold, event name), and visual audit alerts.
- `nodeTypes.js`: Maps all registered backend types to their respective React components.

---

## 4. Automated Verification Results

All custom nodes are verified using `backend/src/test-nodes.js`.

### Test Execution Command
```bash
cd backend
npm run test-nodes
```

### Actual Test Results
```
================================================================
         ProxiSpeak Week 2 — Node Library Test Suite            
================================================================

✓ PASS: Data Source: Static Value — Emitted exact configured static value 42
✓ PASS: Data Source: Interval Timer — Emitted exact requested 3 ticks at 20ms cadence
✓ PASS: Data Source: Manual Input Pusher — Successfully pushed and observed interactive inputs
✓ PASS: Data Source: Mock Telemetry Stream — Emitted 4 simulated geospatial presence frames
✓ PASS: Math Operations: Arithmetic & Comparison — All core math and relational operations validated
✓ PASS: Math Operations: Division by Zero Safety — Safely handled division by zero with fallback and error mode
✓ PASS: Math Operations: Non-Numeric Validation — Correctly rejected invalid non-numeric inputs
✓ PASS: Action Trigger: Logger & Rate Limiter — Throttled rapid burst to single structured log entry
✓ PASS: Action Trigger: Event Emitter — Dispatched internal event with verified payload
✓ PASS: Action Trigger: Threshold Alert — Correctly filtered and triggered 2 threshold breaches

┌─────────┬────────────────────────────────────────────┬──────────┬────────────────────────────────────────────────────────────────┐
│ (index) │ Test                                       │ Status   │ Details                                                        │
├─────────┼────────────────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────┤
│ 0       │ 'Data Source: Static Value'                │ 'PASSED' │ 'Emitted exact configured static value 42'                     │
│ 1       │ 'Data Source: Interval Timer'              │ 'PASSED' │ 'Emitted exact requested 3 ticks at 20ms cadence'              │
│ 2       │ 'Data Source: Manual Input Pusher'         │ 'PASSED' │ 'Successfully pushed and observed interactive inputs'          │
│ 3       │ 'Data Source: Mock Telemetry Stream'       │ 'PASSED' │ 'Emitted 4 simulated geospatial presence frames'               │
│ 4       │ 'Math Operations: Arithmetic & Comparison' │ 'PASSED' │ 'All core math and relational operations validated'            │
│ 5       │ 'Math Operations: Division by Zero Safety' │ 'PASSED' │ 'Safely handled division by zero with fallback and error mode' │
│ 6       │ 'Math Operations: Non-Numeric Validation'  │ 'PASSED' │ 'Correctly rejected invalid non-numeric inputs'                │
│ 7       │ 'Action Trigger: Logger & Rate Limiter'    │ 'PASSED' │ 'Throttled rapid burst to single structured log entry'         │
│ 8       │ 'Action Trigger: Event Emitter'            │ 'PASSED' │ 'Dispatched internal event with verified payload'              │
│ 9       │ 'Action Trigger: Threshold Alert'          │ 'PASSED' │ 'Correctly filtered and triggered 2 threshold breaches'        │
└─────────┴────────────────────────────────────────────┴──────────┴────────────────────────────────────────────────────────────────┘

🎉 ALL 10 NODE LIBRARY TESTS PASSED!
```
