const { isNodeTypeSupported, getNodeDefinition } = require('./nodeRegistry');

const MAX_ALLOWED_NODES = 200;
const MAX_ALLOWED_EDGES = 500;

/**
 * Validates a React Flow serialized graph structure.
 * Checks for:
 * - Structural validity (arrays of nodes & edges)
 * - Size limits (prevent DOS)
 * - Supported node types
 * - Valid node data/config
 * - Valid edge references (source and target nodes exist)
 * - Valid port/handle references
 * - Cycle detection (DAG verification)
 * - Computes topological execution order
 *
 * @param {object} graph - Serialized graph JSON
 * @returns {object} Validation report
 */
function validateGraph(graph) {
  const errors = [];
  const warnings = [];

  if (!graph || typeof graph !== 'object') {
    return {
      isValid: false,
      errors: ['Graph payload must be a non-null JSON object.'],
      warnings: [],
      executionOrder: []
    };
  }

  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  if (!Array.isArray(graph.nodes)) {
    errors.push('Graph "nodes" property must be an array.');
  }
  if (!Array.isArray(graph.edges)) {
    errors.push('Graph "edges" property must be an array.');
  }

  if (nodes.length === 0) {
    errors.push('Graph must contain at least one node.');
  }
  if (nodes.length > MAX_ALLOWED_NODES) {
    errors.push(`Graph exceeds maximum node limit of ${MAX_ALLOWED_NODES} (found ${nodes.length}).`);
  }
  if (edges.length > MAX_ALLOWED_EDGES) {
    errors.push(`Graph exceeds maximum edge limit of ${MAX_ALLOWED_EDGES} (found ${edges.length}).`);
  }

  // Map nodes by ID and check uniqueness
  const nodeMap = new Map();
  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      errors.push('Invalid node entry: must be an object.');
      continue;
    }
    if (!node.id || typeof node.id !== 'string') {
      errors.push(`Node is missing required string "id": ${JSON.stringify(node)}`);
      continue;
    }
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node ID detected: "${node.id}".`);
      continue;
    }

    if (!node.type || typeof node.type !== 'string') {
      errors.push(`Node "${node.id}" is missing required "type".`);
      continue;
    }

    if (!isNodeTypeSupported(node.type)) {
      errors.push(`Unsupported node type "${node.type}" on node "${node.id}".`);
      continue;
    }

    const nodeDef = getNodeDefinition(node.type);
    const configCheck = nodeDef.validateConfig(node.data || {});
    if (!configCheck.valid) {
      errors.push(`Configuration error on node "${node.id}" (${node.type}): ${configCheck.error}`);
    }

    nodeMap.set(node.id, {
      ...node,
      definition: nodeDef
    });
  }

  // Validate edges and port handles
  const incomingEdges = new Map(); // targetNodeId -> array of edges
  const outgoingEdges = new Map(); // sourceNodeId -> array of edges
  const adjacency = new Map();     // nodeId -> array of targetNodeIds
  const inDegree = new Map();      // nodeId -> number of incoming edges

  for (const nodeId of nodeMap.keys()) {
    incomingEdges.set(nodeId, []);
    outgoingEdges.set(nodeId, []);
    adjacency.set(nodeId, []);
    inDegree.set(nodeId, 0);
  }

  const seenEdgeIds = new Set();

  for (const edge of edges) {
    if (!edge || typeof edge !== 'object') {
      errors.push('Invalid edge entry: must be an object.');
      continue;
    }

    if (edge.id) {
      if (seenEdgeIds.has(edge.id)) {
        errors.push(`Duplicate edge ID: "${edge.id}".`);
      }
      seenEdgeIds.add(edge.id);
    }

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode) {
      errors.push(`Edge "${edge.id || 'unnamed'}" references non-existent source node "${edge.source}".`);
    }
    if (!targetNode) {
      errors.push(`Edge "${edge.id || 'unnamed'}" references non-existent target node "${edge.target}".`);
    }

    if (sourceNode && targetNode) {
      // Validate source handle if specified
      if (edge.sourceHandle && sourceNode.definition.outputs.length > 0) {
        if (!sourceNode.definition.outputs.includes(edge.sourceHandle)) {
          warnings.push(`Edge "${edge.id}" uses unrecognized sourceHandle "${edge.sourceHandle}" on node "${sourceNode.id}".`);
        }
      }

      // Validate target handle if specified
      if (edge.targetHandle && targetNode.definition.inputs.length > 0) {
        if (!targetNode.definition.inputs.includes(edge.targetHandle)) {
          warnings.push(`Edge "${edge.id}" uses unrecognized targetHandle "${edge.targetHandle}" on node "${targetNode.id}".`);
        }
      }

      incomingEdges.get(targetNode.id).push(edge);
      outgoingEdges.get(sourceNode.id).push(edge);
      adjacency.get(sourceNode.id).push(targetNode.id);
      inDegree.set(targetNode.id, inDegree.get(targetNode.id) + 1);
    }
  }

  // Cycle detection and topological execution ordering using Kahn's Algorithm
  const executionOrder = [];
  if (errors.length === 0) {
    const queue = [];
    const tempInDegree = new Map(inDegree);

    for (const [nodeId, deg] of tempInDegree.entries()) {
      if (deg === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const currentId = queue.shift();
      executionOrder.push(currentId);

      const neighbors = adjacency.get(currentId) || [];
      for (const neighborId of neighbors) {
        const updatedDeg = tempInDegree.get(neighborId) - 1;
        tempInDegree.set(neighborId, updatedDeg);
        if (updatedDeg === 0) {
          queue.push(neighborId);
        }
      }
    }

    if (executionOrder.length !== nodeMap.size) {
      const cycleNodes = [];
      for (const [nodeId, deg] of tempInDegree.entries()) {
        if (deg > 0) {
          cycleNodes.push(nodeId);
        }
      }
      errors.push(`Cycle detected in graph. Nodes involved in cycle: [${cycleNodes.join(', ')}]. Graphs must be acyclic (DAG).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    executionOrder,
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
    nodeMap,
    incomingEdges,
    outgoingEdges
  };
}

module.exports = {
  validateGraph,
  MAX_ALLOWED_NODES,
  MAX_ALLOWED_EDGES
};
