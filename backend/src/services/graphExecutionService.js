const { validateGraph } = require('../compiler/graphValidator');
const { compileGraph } = require('../compiler/graphCompiler');

class GraphExecutionService {
  constructor() {
    this.executions = new Map(); // executionId -> pipeline instance
    this.history = [];           // finished execution records
    this.maxHistory = 50;
  }

  /**
   * Validates graph JSON structure without compiling
   */
  validate(graph) {
    return validateGraph(graph);
  }

  /**
   * Compiles graph JSON into an executable instance and stores it
   */
  compile(graph, options = {}) {
    const result = compileGraph(graph, options);
    if (!result.success) {
      return result;
    }

    this.executions.set(result.executionId, result.pipeline);
    return {
      success: true,
      executionId: result.executionId,
      graphId: result.graphId,
      nodeCount: result.nodeCount,
      edgeCount: result.edgeCount,
      executionOrder: result.executionOrder,
      warnings: result.warnings
    };
  }

  /**
   * Compiles and executes a graph for a specified duration or until completion
   */
  async execute(graph, options = {}) {
    const compilation = compileGraph(graph, options);
    if (!compilation.success) {
      return {
        success: false,
        errors: compilation.errors,
        warnings: compilation.warnings
      };
    }

    const pipeline = compilation.pipeline;
    const executionId = compilation.executionId;
    this.executions.set(executionId, pipeline);

    const timeoutMs = Math.min(10000, Math.max(50, Number(options.durationMs) || 1000));
    const result = await pipeline.runUntilTimeout(timeoutMs);

    const record = {
      executionId,
      graphId: compilation.graphId,
      nodeCount: compilation.nodeCount,
      edgeCount: compilation.edgeCount,
      durationMs: timeoutMs,
      status: result.status,
      eventCount: (result.events || []).length,
      events: result.events,
      logs: result.logs,
      emittedEvents: result.emittedEvents,
      triggeredAlerts: result.triggeredAlerts,
      timestamp: new Date().toISOString()
    };

    this.history.unshift(record);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Clean up pipeline from active executions map
    this.executions.delete(executionId);

    return {
      success: true,
      ...record
    };
  }

  /**
   * Injects input into a manual source node in an active pipeline
   */
  pushInput(executionId, nodeId, value) {
    const pipeline = this.executions.get(executionId);
    if (!pipeline) {
      throw new Error(`Execution "${executionId}" not found or already stopped.`);
    }
    pipeline.pushInput(nodeId, value);
    return { success: true, executionId, nodeId, value };
  }

  /**
   * Stops a running execution and frees subscriptions
   */
  stop(executionId) {
    const pipeline = this.executions.get(executionId);
    if (!pipeline) {
      return { success: false, message: `Execution "${executionId}" not found.` };
    }

    pipeline.stop();
    this.executions.delete(executionId);
    return { success: true, executionId, status: 'STOPPED' };
  }

  /**
   * Retrieves status of an execution
   */
  getStatus(executionId) {
    const pipeline = this.executions.get(executionId);
    if (pipeline) {
      return { found: true, active: true, ...pipeline.getStatus() };
    }

    const past = this.history.find((h) => h.executionId === executionId);
    if (past) {
      return { found: true, active: false, ...past };
    }

    return { found: false, message: `Execution "${executionId}" not found.` };
  }

  /**
   * Lists currently active running executions
   */
  listActive() {
    const active = [];
    for (const [id, pipeline] of this.executions.entries()) {
      active.push(pipeline.getStatus());
    }
    return active;
  }
}

// Export singleton instance
module.exports = new GraphExecutionService();
