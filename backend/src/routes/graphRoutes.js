const express = require('express');
const router = express.Router();
const graphExecutionService = require('../services/graphExecutionService');
const { listSupportedNodeTypes } = require('../compiler/nodeRegistry');

/**
 * GET /api/graph/nodes
 * Returns registry of all supported node types and schemas
 */
router.get('/nodes', (req, res) => {
  try {
    const nodes = listSupportedNodeTypes();
    res.json({ success: true, count: nodes.length, nodes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/validate
 * Validates graph JSON structure, handles, and checks for cycles
 */
router.post('/validate', (req, res) => {
  try {
    const report = graphExecutionService.validate(req.body);
    res.json({
      success: report.isValid,
      ...report
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/compile
 * Compiles graph into executable pipeline instance
 */
router.post('/compile', (req, res) => {
  try {
    const result = graphExecutionService.compile(req.body);
    if (!result.success) {
      return res.status(422).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/execute
 * Compiles and executes graph for a given duration
 */
router.post('/execute', async (req, res) => {
  try {
    const { graph, durationMs } = req.body;
    const targetGraph = graph || req.body;
    const result = await graphExecutionService.execute(targetGraph, { durationMs });
    if (!result.success) {
      return res.status(422).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/stop/:executionId
 * Stops an ongoing execution
 */
router.post('/stop/:executionId', (req, res) => {
  try {
    const result = graphExecutionService.stop(req.params.executionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/graph/status/:executionId
 * Checks status of an active or recent execution
 */
router.get('/status/:executionId', (req, res) => {
  try {
    const status = graphExecutionService.getStatus(req.params.executionId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/graph/active
 * Lists all currently running executions
 */
router.get('/active', (req, res) => {
  try {
    const active = graphExecutionService.listActive();
    res.json({ success: true, count: active.length, active });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
