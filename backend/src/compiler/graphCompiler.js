const crypto = require('crypto');
const { merge, of } = require('rxjs');
const { share, catchError, takeUntil } = require('rxjs/operators');
const { validateGraph } = require('./graphValidator');
const operators = require('./operators');

/**
 * Compiles a validated React Flow graph JSON into an executable RxJS pipeline.
 *
 * @param {object} graph - Raw or serialized graph JSON
 * @param {object} compileOptions - Optional compiler settings
 * @returns {object} Compilation result containing executable pipeline and metadata
 */
function compileGraph(graph, compileOptions = {}) {
  const validation = validateGraph(graph);

  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
      pipeline: null
    };
  }

  const { nodeMap, incomingEdges, outgoingEdges, executionOrder } = validation;
  const executionId = compileOptions.executionId || `exec-${crypto.randomBytes(6).toString('hex')}`;
  const graphId = graph.id || `graph-${crypto.randomBytes(4).toString('hex')}`;

  // State containers for execution instance
  const nodeStreams = new Map(); // nodeId -> Observable
  const manualPusherMap = new Map(); // nodeId -> push function
  const executionLogs = [];
  const emittedEvents = [];
  const triggeredAlerts = [];

  const executionContext = {
    executionId,
    graphId,
    onLog: (entry) => executionLogs.push(entry),
    onEmit: (evt) => emittedEvents.push(evt),
    onAlert: (alert) => triggeredAlerts.push(alert)
  };

  // Compile each node in topological order
  for (const nodeId of executionOrder) {
    const node = nodeMap.get(nodeId);
    const inEdges = incomingEdges.get(nodeId) || [];
    let nodeStream$ = null;

    try {
      switch (node.type) {
        case 'source_static': {
          nodeStream$ = operators.createStaticSource(node.data).pipe(share());
          break;
        }

        case 'source_interval': {
          nodeStream$ = operators.createIntervalSource(node.data).pipe(share());
          break;
        }

        case 'source_manual': {
          const manual = operators.createManualSource(node.data);
          manualPusherMap.set(nodeId, manual);
          nodeStream$ = manual.stream$.pipe(share());
          break;
        }

        case 'source_mock_events': {
          nodeStream$ = operators.createMockEventsSource(node.data).pipe(share());
          break;
        }

        case 'math_operation': {
          // Identify incoming streams for handles 'a' and 'b'
          let streamA$ = null;
          let streamB$ = null;

          for (const edge of inEdges) {
            const upstream = nodeStreams.get(edge.source);
            if (edge.targetHandle === 'a') {
              streamA$ = upstream;
            } else if (edge.targetHandle === 'b') {
              streamB$ = upstream;
            } else if (!streamA$) {
              streamA$ = upstream;
            } else if (!streamB$) {
              streamB$ = upstream;
            }
          }

          nodeStream$ = operators.createMathStream(streamA$, streamB$, node.data).pipe(share());
          break;
        }

        case 'action_logger': {
          const upstream = inEdges.length > 0 ? nodeStreams.get(inEdges[0].source) : of(null);
          nodeStream$ = operators.createActionLoggerStream(upstream, node.data, executionContext).pipe(share());
          break;
        }

        case 'action_event_emitter': {
          const upstream = inEdges.length > 0 ? nodeStreams.get(inEdges[0].source) : of(null);
          nodeStream$ = operators.createActionEventEmitterStream(upstream, node.data, executionContext).pipe(share());
          break;
        }

        case 'action_threshold_alert': {
          const upstream = inEdges.length > 0 ? nodeStreams.get(inEdges[0].source) : of(null);
          nodeStream$ = operators.createActionThresholdAlertStream(upstream, node.data, executionContext).pipe(share());
          break;
        }

        default:
          throw new Error(`Unsupported node type during compilation: "${node.type}"`);
      }

      // Safe error catching to prevent server crashes
      nodeStream$ = nodeStream$.pipe(
        catchError((err) => {
          const streamErr = {
            error: true,
            nodeId,
            message: err.message,
            timestamp: Date.now()
          };
          executionContext.onLog({
            action: 'error',
            prefix: '[STREAM-ERROR]',
            payload: streamErr,
            timestamp: Date.now()
          });
          return of(streamErr);
        })
      );

      nodeStreams.set(nodeId, nodeStream$);
    } catch (compilationErr) {
      return {
        success: false,
        errors: [`Compilation failed at node "${nodeId}" (${node.type}): ${compilationErr.message}`],
        warnings: validation.warnings,
        pipeline: null
      };
    }
  }

  // Find sink/terminal nodes (nodes with 0 outgoing edges)
  const sinkNodeIds = executionOrder.filter((id) => (outgoingEdges.get(id) || []).length === 0);
  const sinkStreams = (sinkNodeIds.length > 0 ? sinkNodeIds : executionOrder)
    .map((id) => nodeStreams.get(id))
    .filter(Boolean);

  const rootPipeline$ = sinkStreams.length > 0 ? merge(...sinkStreams) : of({ message: 'Empty graph pipeline' });

  // Execution controllers
  let activeSubscription = null;
  let isRunning = false;
  let status = 'READY';

  const executable = {
    executionId,
    graphId,
    status,
    nodeCount: validation.nodeCount,
    edgeCount: validation.edgeCount,
    executionOrder,
    logs: executionLogs,
    emittedEvents,
    triggeredAlerts,

    /**
     * Injects data into a manual input source node
     */
    pushInput: (nodeId, value) => {
      const pusher = manualPusherMap.get(nodeId);
      if (!pusher) {
        throw new Error(`Node "${nodeId}" is not a manual input source.`);
      }
      pusher.push(value);
    },

    /**
     * Starts execution and returns the active subscription
     */
    start: ({ onNext, onError, onComplete } = {}) => {
      if (isRunning) {
        throw new Error(`Execution "${executionId}" is already running.`);
      }

      isRunning = true;
      status = 'RUNNING';

      activeSubscription = rootPipeline$.subscribe({
        next: (value) => {
          if (onNext && typeof onNext === 'function') onNext(value);
        },
        error: (err) => {
          status = 'ERROR';
          isRunning = false;
          if (onError && typeof onError === 'function') onError(err);
        },
        complete: () => {
          status = 'COMPLETED';
          isRunning = false;
          if (onComplete && typeof onComplete === 'function') onComplete();
        }
      });

      return activeSubscription;
    },

    /**
     * Stops execution and unsubscribes all streams to prevent memory leaks
     */
    stop: () => {
      if (activeSubscription && !activeSubscription.closed) {
        activeSubscription.unsubscribe();
      }
      // Also complete all manual subjects
      for (const pusher of manualPusherMap.values()) {
        try {
          pusher.complete();
        } catch (_) {}
      }
      isRunning = false;
      status = 'STOPPED';
      return { executionId, status: 'STOPPED' };
    },

    /**
     * Executes the pipeline synchronously/asynchronously for a given duration or event limit
     */
    runUntilTimeout: (timeoutMs = 1500) => {
      return new Promise((resolve) => {
        const events = [];
        executable.start({
          next: (evt) => events.push(evt),
          error: (err) => resolve({ status: 'ERROR', error: err.message, events, logs: executionLogs }),
          complete: () => resolve({ status: 'COMPLETED', events, logs: executionLogs })
        });

        setTimeout(() => {
          executable.stop();
          resolve({
            status: 'TIMEOUT_STOPPED',
            events,
            logs: executionLogs,
            emittedEvents,
            triggeredAlerts
          });
        }, timeoutMs);
      });
    },

    getStatus: () => ({
      executionId,
      graphId,
      status,
      isRunning,
      logCount: executionLogs.length,
      emittedCount: emittedEvents.length,
      alertCount: triggeredAlerts.length
    })
  };

  return {
    success: true,
    executionId,
    graphId,
    nodeCount: validation.nodeCount,
    edgeCount: validation.edgeCount,
    executionOrder,
    warnings: validation.warnings,
    pipeline: executable
  };
}

module.exports = {
  compileGraph
};
